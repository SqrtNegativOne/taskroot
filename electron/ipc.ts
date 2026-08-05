import { ipcMain, BrowserWindow, globalShortcut } from "electron";
import path from "node:path";
import fs from "node:fs";
import { APP_ROOT } from "./constants.js";
import { windowManager } from "./windowManager.js";

export function setupIpcHandlers() {
    const LAUNCHER_WIDTH = 640;
    const handlers: Record<string, (event: Electron.IpcMainEvent, ...args: unknown[]) => void> = {
        "log-to-file": (event, level, message) => {
            const logPath = path.join(APP_ROOT, "taskroot.log");
            const timestamp = new Date().toISOString();
            const logLine = `[${timestamp}] [${String(level).toUpperCase()}] ${String(message)}\n`;
            try {
                fs.appendFileSync(logPath, logLine);
            } catch (err) {
                console.error("Failed to write to log file:", err);
            }
        },
        "window-minimize": (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window === windowManager.win) {
                windowManager.win?.minimize();
                windowManager.createMiniWindow();
            } else {
                window?.minimize();
            }
        },
        "window-maximize": (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window?.isMaximized()) {
                window?.unmaximize();
            } else {
                window?.maximize();
            }
        },
        "window-close": (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window === windowManager.win) {
                windowManager.win?.hide();
                windowManager.createMiniWindow();
            } else {
                window?.close();
            }
        },
        "window-restore-main": () => windowManager.restoreOrCreateMainWindow(),
        "set-snap-threshold": (event, threshold) => { 
            if (typeof threshold === 'number') windowManager.snapThreshold = threshold; 
        },
        "window-start-drag": (event, offsetX, offsetY) => {
            if (typeof offsetX === 'number' && typeof offsetY === 'number') windowManager.startDrag(offsetX, offsetY);
        },
        "window-drag-tick": () => windowManager.dragTick(),
        "window-end-drag": () => windowManager.endDrag(),
        "update-shortcut": (event, shortcut) => {
            globalShortcut.unregisterAll();
            if (typeof shortcut === 'string') {
                try {
                    globalShortcut.register(shortcut, () => {
                        windowManager.toggleLauncher();
                    });
                } catch (err) {
                    console.error("Failed to register shortcut", err);
                }
            }
        },
        "hide-launcher": () => {
            if (windowManager.launcherWin) {
                windowManager.launcherWin.hide();
            }
        },
        "launcher-command": (event, commandData) => {
            if (windowManager.win && !windowManager.win.isDestroyed()) {
                windowManager.win.webContents.send("launcher-command-execute", commandData);
            }
        },
        "launcher-data-update": (event, data) => {
            if (windowManager.launcherWin && !windowManager.launcherWin.isDestroyed()) {
                windowManager.launcherWin.webContents.send("launcher-data-sync", data);
            }
        },
        "reset-minitracker": () => windowManager.resetMinitracker(),
        "resize-launcher": (event, height) => {
            if (typeof height === 'number' && windowManager.launcherWin && !windowManager.launcherWin.isDestroyed()) {
                windowManager.launcherWin.setContentSize(LAUNCHER_WIDTH, height);
            }
        }
    };

    for (const [channel, handler] of Object.entries(handlers)) {
        ipcMain.on(channel, handler);
    }
}
