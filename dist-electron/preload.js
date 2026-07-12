import { contextBridge, ipcRenderer } from 'electron';
// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    logToFile: (level, message) => ipcRenderer.send('log-to-file', level, message),
});
