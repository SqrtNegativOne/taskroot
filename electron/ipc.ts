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
}
