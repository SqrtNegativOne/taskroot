import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  logToFile: (level: string, message: string) => ipcRenderer.send('log-to-file', level, message),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreMainWindow: () => ipcRenderer.send('window-restore-main'),
  onDeepLink: (callback: (route: string) => void) => ipcRenderer.on('deep-link', (_event, route) => callback(route)),
  setSnapThreshold: (threshold: number) => ipcRenderer.send('set-snap-threshold', threshold),
  onSnapped: (callback: () => void) => ipcRenderer.on('minitracker-snapped', () => callback()),
  onHover: (callback: (isHovering: boolean) => void) => {
    ipcRenderer.removeAllListeners('minitracker-hover');
    ipcRenderer.on('minitracker-hover', (_event, isHovering) => callback(isHovering));
  },
});
