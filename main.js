const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs/promises');
const fssync = require('fs');
const http = require('http');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let splashWindow = null;
let backendProc = null;
let logsDir = null;
let mainLogPath = null;
let backendLogPath = null;

async function ensureLogs() {
  if (logsDir) return;
  logsDir = path.join(app.getPath('userData'), 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  mainLogPath = path.join(logsDir, 'main.log');
  backendLogPath = path.join(logsDir, 'backend.log');
}

function ts() {
  return new Date().toISOString();
}

function appendLog(filePath, line) {
  try {
    fssync.appendFileSync(filePath, `[${ts()}] ${line}\n`, { encoding: 'utf8' });
  } catch (e) {
    // ignore
  }
}

ipcMain.handle('save-xlsx', async (_event, payload) => {
  try {
    const suggested = payload && payload.defaultFilename ? String(payload.defaultFilename) : 'historico.xlsx';
    const data = payload ? payload.data : null;

    const defaultPath = path.join(app.getPath('downloads'), suggested);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar exportación',
      defaultPath,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (canceled || !filePath) {
      return { cancelled: true };
    }

    const buf =
      Buffer.isBuffer(data)
        ? data
        : data instanceof ArrayBuffer
          ? Buffer.from(new Uint8Array(data))
          : Buffer.from(data || []);

    await fs.writeFile(filePath, buf);
    return { cancelled: false, filePath, savedFilename: path.basename(filePath) };
  } catch (e) {
    return { cancelled: true };
  }
});

ipcMain.handle('open-logs-folder', async () => {
  try {
    await ensureLogs();
    await shell.openPath(logsDir);
    return { ok: true, path: logsDir };
  } catch (e) {
    return { ok: false };
  }
});

function iniciarBackendProduccion() {
  if (isDev) return;
  if (backendProc) return;

  try {
    const backendEntry = path.join(__dirname, 'backend', 'index.js');
    // Asegurar carpeta de logs antes de iniciar
    try {
      if (mainLogPath) appendLog(mainLogPath, `Iniciando backend: ${backendEntry}`);
    } catch (e) {
      // ignore
    }

    backendProc = fork(backendEntry, [], {
      cwd: path.dirname(backendEntry),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || '5000',
        // Permitir resolver dependencias del backend desde extraResources
        NODE_PATH: [
          process.env.NODE_PATH,
          path.join(process.resourcesPath, 'backend', 'node_modules'),
        ]
          .filter(Boolean)
          .join(path.delimiter),
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    if (backendProc.stdout) {
      backendProc.stdout.on('data', (buf) => {
        if (backendLogPath) appendLog(backendLogPath, String(buf).trimEnd());
      });
    }
    if (backendProc.stderr) {
      backendProc.stderr.on('data', (buf) => {
        if (backendLogPath) appendLog(backendLogPath, String(buf).trimEnd());
      });
    }

    backendProc.on('exit', (code, signal) => {
      if (backendLogPath) appendLog(backendLogPath, `Backend terminó. code=${code} signal=${signal || '-'}`);
      backendProc = null;
    });
    backendProc.on('error', (err) => {
      if (backendLogPath) appendLog(backendLogPath, `Error backend process: ${err.message}`);
    });
  } catch (e) {
    if (mainLogPath) appendLog(mainLogPath, `Error iniciando backend: ${e.message}`);
    backendProc = null;
  }
}

// ── Splash window ──────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.setMenuBarVisibility(false);

  // Inyectar la version en el splash
  splashWindow.webContents.once('did-finish-load', () => {
    const ver = app.getVersion ? app.getVersion() : '-';
    try {
      splashWindow.webContents.executeJavaScript(
        `typeof setVersion === 'function' && setVersion(${JSON.stringify(ver)})`
      ).catch(() => {});
    } catch (_) {}
  });
}

function setSplashStatus(msg, pct, cls) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  try {
    const escaped = JSON.stringify(msg);
    const pctJs = pct != null ? String(pct) : 'null';
    const clsJs = cls ? JSON.stringify(cls) : 'null';
    splashWindow.webContents.executeJavaScript(
      `typeof setStatus === 'function' && setStatus(${escaped}, ${pctJs}, ${clsJs})`
    ).catch(() => {});
  } catch (_) {}
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// Espera hasta que el backend responda en el puerto dado
async function waitForBackend(port, timeoutMs) {
  port = port || 5000;
  timeoutMs = timeoutMs || 30000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      try {
        const req = http.get(
          { hostname: '127.0.0.1', port: port, path: '/', timeout: 1500 },
          (res) => { res.resume(); resolve(res.statusCode < 500); }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      } catch (_) {
        resolve(false);
      }
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const createWindow = () => {
  // Evitar problemas de encoding con tildes en algunas configuraciones
  try {
    app.setName('Gestion de Bultos');
  } catch (e) {
    // ignorar
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '',
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // En Windows/Linux: ocultar la barra de menú (Archivo / Ver)
  // También en desarrollo para que el usuario nunca la vea.
  try {
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.setMenuBarVisibility(false);
    Menu.setApplicationMenu(null);
  } catch (e) {
    // ignorar
  }

  // Evitar que el título se actualice desde el frontend (ej: caracteres raros por encoding)
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // En producción, el build se incluye dentro de resources/app/build
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  // En desarrollo NO abrir DevTools automáticamente.
  // Si alguna vez lo necesitas, ejecútalo con ELECTRON_OPEN_DEVTOOLS=1
  if (isDev && String(process.env.ELECTRON_OPEN_DEVTOOLS || '') === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Mantener el título vacío siempre
  try {
    mainWindow.setTitle('');
  } catch (e) {
    // ignorar
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// ── Auto-updater (solo producción) ───────────────────────────────────────────
function initAutoUpdater() {
  if (isDev) return; // No correr en desarrollo

  // Silencioso al verificar; solo mostrar diálogos cuando hay novedad
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    appendLog(mainLogPath, '[updater] Verificando actualizaciones...');
  });

  autoUpdater.on('update-available', (info) => {
    appendLog(mainLogPath, `[updater] Actualización disponible: v${info.version}`);
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización disponible',
        message: `Hay una nueva versión disponible: v${info.version}`,
        detail: 'La actualización se descargará en segundo plano. Te avisaremos cuando esté lista para instalar.',
        buttons: ['Descargar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          appendLog(mainLogPath, '[updater] Usuario aceptó descargar la actualización.');
          autoUpdater.downloadUpdate();
        } else {
          appendLog(mainLogPath, '[updater] Usuario pospuso la descarga.');
        }
      })
      .catch((e) => appendLog(mainLogPath, `[updater] Error en diálogo update-available: ${e.message}`));
  });

  autoUpdater.on('update-not-available', () => {
    appendLog(mainLogPath, '[updater] La aplicación está actualizada.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    appendLog(mainLogPath, `[updater] Descargando... ${pct}%`);
    // Mostrar progreso en la barra de título
    try { mainWindow && mainWindow.setProgressBar(pct / 100); } catch (_) {}
  });

  autoUpdater.on('update-downloaded', (info) => {
    try { mainWindow && mainWindow.setProgressBar(-1); } catch (_) {}
    appendLog(mainLogPath, `[updater] Actualización v${info.version} descargada. Lista para instalar.`);
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización lista',
        message: `v${info.version} descargada y lista para instalar.`,
        detail: '¿Deseas reiniciar la aplicación ahora para aplicar la actualización?',
        buttons: ['Reiniciar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          appendLog(mainLogPath, '[updater] Instalando actualización y reiniciando...');
          autoUpdater.quitAndInstall(false, true);
        } else {
          appendLog(mainLogPath, '[updater] Usuario pospuso el reinicio. Se instalará al cerrar.');
        }
      })
      .catch((e) => appendLog(mainLogPath, `[updater] Error en diálogo update-downloaded: ${e.message}`));
  });

  autoUpdater.on('error', (err) => {
    appendLog(mainLogPath, `[updater] Error: ${err && err.message ? err.message : String(err)}`);
    try { mainWindow && mainWindow.setProgressBar(-1); } catch (_) {}
  });

  // Verificar 3 segundos después de que la ventana esté visible
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      appendLog(mainLogPath, `[updater] checkForUpdates falló: ${e.message}`);
    });
  }, 3000);
}

app.on('ready', async () => {
  await ensureLogs();
  appendLog(mainLogPath, 'App ready');

  process.on('uncaughtException', (err) => {
    appendLog(mainLogPath, `uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
  });
  process.on('unhandledRejection', (err) => {
    appendLog(mainLogPath, `unhandledRejection: ${err && err.stack ? err.stack : String(err)}`);
  });

  // 1. Mostrar splash de inmediato
  createSplashWindow();

  if (!isDev) {
    // 2. Arrancar backend
    setSplashStatus('Iniciando backend...', 15);
    iniciarBackendProduccion();

    // 3. Esperar a que el backend responda (max 35 s)
    setSplashStatus('Esperando backend...', 30);
    const backendOk = await waitForBackend(5000, 35000);

    if (backendOk) {
      appendLog(mainLogPath, '[splash] Backend listo');
      setSplashStatus('Backend listo', 55, 'ok');
      await new Promise((r) => setTimeout(r, 400));
    } else {
      appendLog(mainLogPath, '[splash] Backend no respondio en 35 s');
      setSplashStatus('Backend no respondio - continuando...', 55, 'err');
      await new Promise((r) => setTimeout(r, 2000));
    }
  } else {
    // Modo desarrollo: el backend corre por separado
    setSplashStatus('Modo desarrollo', 55);
    await new Promise((r) => setTimeout(r, 500));
  }

  // 4. Crear la ventana principal (oculta)
  setSplashStatus('Cargando aplicacion...', 75);
  createWindow();

  // 5. Cuando el frontend termina de cargar -> cerrar splash y mostrar app
  mainWindow.webContents.once('did-finish-load', () => {
    setSplashStatus('Listo', 100, 'ok');
    appendLog(mainLogPath, '[splash] Frontend listo - cerrando splash');
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      closeSplash();
    }, 350);
  });

  // Seguro: si did-finish-load nunca llega (timeout 15 s), mostrar igual
  setTimeout(() => {
    if (splashWindow) {
      appendLog(mainLogPath, '[splash] Timeout - mostrando ventana de todas formas');
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
      closeSplash();
    }
  }, 15000);

  initAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  try {
    if (backendProc && !backendProc.killed) backendProc.kill();
  } catch (e) {
    // ignore
  }
});

// Menú (opcional). Por defecto lo dejamos deshabilitado.
const createMenu = () => {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// Si alguna vez quieres reactivarlo, cambia a true.
const ENABLE_APP_MENU = false;
if (ENABLE_APP_MENU) {
  app.on('ready', createMenu);
}
