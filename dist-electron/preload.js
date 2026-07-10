import { contextBridge } from 'electron';
// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
// Add whatever IPC communications you need here in the future
});
