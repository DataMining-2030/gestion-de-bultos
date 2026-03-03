const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs/promises');
const { fork } = require('child_process');

let mainWindow;
let backendProc = null;

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

function iniciarBackendProduccion() {
  if (isDev) return;
  if (backendProc) return;

  try {
    const backendEntry = path.join(__dirname, 'backend', 'index.js');
    backendProc = fork(backendEntry, [], {
      cwd: path.dirname(backendEntry),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || '5000',
      },
      stdio: 'ignore',
    });

    backendProc.on('exit', () => {
      backendProc = null;
    });
  } catch (e) {
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

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

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

app.on('ready', () => {
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
