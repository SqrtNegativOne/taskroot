import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  logToFile: (level: string, message: string) => ipcRenderer.send('log-to-file', level, message),
});
