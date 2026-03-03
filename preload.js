const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  /**
   * Guarda un XLSX en disco mediante diálogo nativo de Electron.
   * @param {{ defaultFilename: string, data: ArrayBuffer }} payload
   * @returns {Promise<{ cancelled: boolean, filePath?: string, savedFilename?: string }>}
   */
  saveXlsx: (payload) => ipcRenderer.invoke('save-xlsx', payload),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
});
