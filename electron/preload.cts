import { contextBridge, ipcRenderer } from 'electron';

const api: Record<string, unknown> = {};

const sendChannels = {
  logToFile: 'log-to-file',
  minimizeWindow: 'window-minimize',
  maximizeWindow: 'window-maximize',
  closeWindow: 'window-close',
  restoreMainWindow: 'window-restore-main',
  setSnapThreshold: 'set-snap-threshold',
  startDrag: 'window-start-drag',
  dragTick: 'window-drag-tick',
  endDrag: 'window-end-drag',
  updateShortcut: 'update-shortcut',
  hideLauncher: 'hide-launcher',
  executeLauncherCommand: 'launcher-command',
  pushLauncherData: 'launcher-data-update',
  resetMinitracker: 'reset-minitracker',
  resizeLauncher: 'resize-launcher',
};

for (const [method, channel] of Object.entries(sendChannels)) {
  api[method] = (...args: unknown[]) => ipcRenderer.send(channel, ...args);
}

const receiveChannels = {
  onDeepLink: 'deep-link',
  onSnapped: 'minitracker-snapped',
  onHover: 'minitracker-hover',
  onLauncherCommand: 'launcher-command-execute',
  onLauncherDataUpdate: 'launcher-data-sync',
};

for (const [method, channel] of Object.entries(receiveChannels)) {
  api[method] = (callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  };
}

contextBridge.exposeInMainWorld('electronAPI', api);
