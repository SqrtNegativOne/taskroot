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
    setSnapThreshold: (threshold) => electron_1.ipcRenderer.send('set-snap-threshold', threshold),
    onSnapped: (callback) => electron_1.ipcRenderer.on('minitracker-snapped', () => callback()),
    onHover: (callback) => {
        electron_1.ipcRenderer.removeAllListeners('minitracker-hover');
        electron_1.ipcRenderer.on('minitracker-hover', (_event, isHovering) => callback(isHovering));
    },
    startDrag: (offsetX, offsetY) => electron_1.ipcRenderer.send('window-start-drag', offsetX, offsetY),
    dragTick: () => electron_1.ipcRenderer.send('window-drag-tick'),
    endDrag: () => electron_1.ipcRenderer.send('window-end-drag'),
});
