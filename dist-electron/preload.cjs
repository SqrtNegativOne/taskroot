"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose safe APIs to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    logToFile: (level, message) => electron_1.ipcRenderer.send('log-to-file', level, message),
    minimizeWindow: () => electron_1.ipcRenderer.send('window-minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window-maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window-close'),
    restoreMainWindow: () => electron_1.ipcRenderer.send('window-restore-main'),
    onDeepLink: (callback) => electron_1.ipcRenderer.on('deep-link', (_event, route) => callback(route)),
});
