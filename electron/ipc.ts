import { ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { APP_ROOT } from "./constants.js";
import { windowManager } from "./windowManager.js";

export function setupIpcHandlers() {
    // Handle file logging from renderer
    ipcMain.on("log-to-file", (event, level, message) => {
        const logPath = path.join(APP_ROOT, "taskroot.log");
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        try {
            fs.appendFileSync(logPath, logLine);
        } catch (err) {
            console.error("Failed to write to log file:", err);
        }
    });

    // Window controls
    ipcMain.on("window-minimize", (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window === windowManager.win) {
            windowManager.win?.minimize();
            windowManager.createMiniWindow();
        } else {
            window?.minimize();
        }
    });

    ipcMain.on("window-maximize", (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window?.isMaximized()) {
            window?.unmaximize();
        } else {
            window?.maximize();
        }
    });

    ipcMain.on("window-close", (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window === windowManager.win) {
            windowManager.win?.hide();
            windowManager.createMiniWindow();
        } else {
            window?.close();
        }
    });

    ipcMain.on("window-restore-main", () => {
        windowManager.restoreOrCreateMainWindow();
    });

    ipcMain.on("set-snap-threshold", (event, threshold) => {
        windowManager.snapThreshold = threshold;
    });

    ipcMain.on("window-start-drag", (event, offsetX, offsetY) => {
        windowManager.startDrag(offsetX, offsetY);
    });

    ipcMain.on("window-drag-tick", (_event) => {
        windowManager.dragTick();
    });

    ipcMain.on("window-end-drag", (_event) => {
        windowManager.endDrag();
    });

    // Launcher IPC
    ipcMain.on("update-shortcut", (event, shortcut) => {
        const { globalShortcut } = require("electron");
        globalShortcut.unregisterAll();
        if (shortcut) {
            try {
                globalShortcut.register(shortcut, () => {
                    windowManager.toggleLauncher();
                });
            } catch (err) {
                console.error("Failed to register shortcut", err);
            }
        }
    });

    ipcMain.on("hide-launcher", (_event) => {
        if (windowManager.launcherWin) {
            windowManager.launcherWin.hide();
        }
    });

    ipcMain.on("launcher-command", (_event, commandData) => {
        // Forward to main window
        if (windowManager.win && !windowManager.win.isDestroyed()) {
            windowManager.win.webContents.send("launcher-command-execute", commandData);
        }
    });

    ipcMain.on("launcher-data-update", (_event, data) => {
        // Forward to launcher window
        if (windowManager.launcherWin && !windowManager.launcherWin.isDestroyed()) {
            windowManager.launcherWin.webContents.send("launcher-data-sync", data);
        }
    });

    ipcMain.on("reset-minitracker", (_event) => {
        windowManager.resetMinitracker();
    });
}
