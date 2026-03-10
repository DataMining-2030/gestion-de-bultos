const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs/promises');
const fssync = require('fs');
const http = require('http');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let splashWindow = null;
let backendProc = null;
let logsDir = null;
let mainLogPath = null;
let backendLogPath = null;

const MIN_SPLASH_TIME = 5000;
const BACKGROUND_COLOR = '#f8fafc'; // Unificado con Login.css

// --- Utilitarios ---
async function ensureLogs() {
  if (logsDir) return;
  logsDir = path.join(app.getPath('userData'), 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  mainLogPath = path.join(logsDir, 'main.log');
  backendLogPath = path.join(logsDir, 'backend.log');
}

function ts() { return new Date().toISOString(); }
function appendLog(filePath, line) {
  try {
    fssync.appendFileSync(filePath, `[${ts()}] ${line}\n`, { encoding: 'utf8' });
  } catch (e) { }
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
    if (canceled || !filePath) return { cancelled: true };
    const buf = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)) : Buffer.from(data || []);
    await fs.writeFile(filePath, buf);
    return { cancelled: false, filePath, savedFilename: path.basename(filePath) };
  } catch (e) { return { cancelled: true }; }
});

ipcMain.handle('open-logs-folder', async () => {
  try {
    await ensureLogs();
    await shell.openPath(logsDir);
    return { ok: true, path: logsDir };
  } catch (e) { return { ok: false }; }
});

ipcMain.handle('get-version', () => app.getVersion());

function setSplashStatus(msg, pct, cls) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const escaped = JSON.stringify(msg);
  const pctJs = pct != null ? String(pct) : 'null';
  const clsJs = cls ? JSON.stringify(cls) : 'null';
  splashWindow.webContents.executeJavaScript(`typeof setStatus === 'function' && setStatus(${escaped}, ${pctJs}, ${clsJs})`).catch(() => { });
}

async function waitForBackend(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get({ hostname: '127.0.0.1', port: port, path: '/', timeout: 1000 }, (res) => { res.resume(); resolve(res.statusCode < 500); });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function iniciarBackendProduccion() {
  if (isDev || backendProc) return;
  const backendEntry = path.join(__dirname, 'backend', 'index.js');
  backendProc = fork(backendEntry, [], {
    cwd: path.dirname(backendEntry),
    env: { ...process.env, NODE_ENV: 'production', PORT: '5000', NODE_PATH: path.join(process.resourcesPath, 'backend', 'node_modules') },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  if (backendProc.stdout) backendProc.stdout.on('data', b => appendLog(backendLogPath, String(b).trimEnd()));
  if (backendProc.stderr) backendProc.stderr.on('data', b => appendLog(backendLogPath, String(b).trimEnd()));
}

// --- Ventanas ---
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400, height: 300,
    frame: false, resizable: false, center: true, show: false, // Esperar al renderizado
    alwaysOnTop: true, skipTaskbar: true, backgroundColor: BACKGROUND_COLOR,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  return new Promise(resolve => {
    // 1. Mostrar SOLO cuando el HTML esté completamente pintado
    splashWindow.once('ready-to-show', () => {
      splashWindow.show();
      resolve();
    });

    // 2. Inyectar versión apenas el DOM cargue
    splashWindow.webContents.once('did-finish-load', () => {
      const ver = app.getVersion ? app.getVersion() : '-';
      splashWindow.webContents.executeJavaScript(
        `typeof setVersion === 'function' && setVersion(${JSON.stringify(ver)})`
      ).catch(() => { });
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, show: false, backgroundColor: BACKGROUND_COLOR,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  });
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  if (isDev) mainWindow.loadURL('http://localhost:3000');
  else mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));

  return new Promise(resolve => mainWindow.once('ready-to-show', resolve));
}

// --- Ciclo de Vida ---
app.on('ready', async () => {
  const startTime = Date.now();
  await ensureLogs();
  appendLog(mainLogPath, 'App starting...');

  // 1. Splash inmediato y prolijo
  await createSplashWindow();
  setSplashStatus('Iniciando sistema...', 10);

  // 2. Iniciar procesos internos mientras el splash es visible
  const initProcesses = (async () => {
    if (!isDev) {
      setSplashStatus('Arrancando servicios...', 30);
      iniciarBackendProduccion();
      await waitForBackend(5000, 30000);
    } else {
      setSplashStatus('Esperando React (Dev)...', 30);
      await waitForBackend(3000, 60000); // 60s max para que compile React
    }
    setSplashStatus('Cargando interfaz...', 60);
    await createMainWindow();
    setSplashStatus('Todo listo', 100, 'ok');
  })();

  // 3. Garantizar tiempo mínimo y sincronización final
  await initProcesses;
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);

  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }

    // Fade-out suave usando opacidad de sistema para el splash
    if (splashWindow && !splashWindow.isDestroyed()) {
      let opacity = 1;
      const fadeInterval = setInterval(() => {
        if (!splashWindow || splashWindow.isDestroyed()) {
          clearInterval(fadeInterval);
          return;
        }
        opacity -= 0.05;
        if (opacity <= 0) {
          clearInterval(fadeInterval);
          splashWindow.close();
        } else {
          splashWindow.setOpacity(opacity);
        }
      }, 15); // Transición rápida y muy fluida
    }
  }, remaining);

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(e => appendLog(mainLogPath, `Update error: ${e.message}`));
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (backendProc && !backendProc.killed) backendProc.kill(); });
