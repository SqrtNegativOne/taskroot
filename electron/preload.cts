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
  startDrag: (offsetX: number, offsetY: number) => ipcRenderer.send('window-start-drag', offsetX, offsetY),
  dragTick: () => ipcRenderer.send('window-drag-tick'),
  endDrag: () => ipcRenderer.send('window-end-drag'),

  // Launcher APIs
  updateShortcut: (shortcut: string) => ipcRenderer.send('update-shortcut', shortcut),
  hideLauncher: () => ipcRenderer.send('hide-launcher'),
  executeLauncherCommand: (commandData: unknown) => ipcRenderer.send('launcher-command', commandData),
  onLauncherCommand: (callback: (commandData: unknown) => void) => {
    ipcRenderer.removeAllListeners('launcher-command-execute');
    ipcRenderer.on('launcher-command-execute', (_event, commandData) => callback(commandData));
  },
  pushLauncherData: (data: { tasks: unknown[], events: unknown[] }) => ipcRenderer.send('launcher-data-update', data),
  onLauncherDataUpdate: (callback: (data: { tasks: unknown[], events: unknown[] }) => void) => {
    ipcRenderer.removeAllListeners('launcher-data-sync');
    ipcRenderer.on('launcher-data-sync', (_event, data) => callback(data));
  },
  resetMinitracker: () => ipcRenderer.send('reset-minitracker'),
});
