const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs/promises');
const fssync = require('fs');
const { fork } = require('child_process');

let mainWindow;
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

app.on('ready', async () => {
  await ensureLogs();
  appendLog(mainLogPath, 'App ready');

  process.on('uncaughtException', (err) => {
    appendLog(mainLogPath, `uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
  });
  process.on('unhandledRejection', (err) => {
    appendLog(mainLogPath, `unhandledRejection: ${err && err.stack ? err.stack : String(err)}`);
  });

  iniciarBackendProduccion();
  createWindow();
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
