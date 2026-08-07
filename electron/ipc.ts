import { ipcMain, BrowserWindow, globalShortcut } from "electron";
import path from "node:path";
import fs from "node:fs";
import { APP_ROOT } from "./constants.js";
import { windowManager } from "./windowManager.js";

const LAUNCHER_WIDTH = 640;

function handleLogToFile(_event: Electron.IpcMainEvent, ...args: unknown[]) {
    const [level, message] = args;
    const logPath = path.join(APP_ROOT, "taskroot.log");
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${String(level).toUpperCase()}] ${String(message)}\n`;
    try {
        fs.appendFileSync(logPath, logLine);
    } catch (err) {
        console.error("Failed to write to log file:", err);
    }
}

function handleWindowMinimize(event: Electron.IpcMainEvent, ..._args: unknown[]) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window === windowManager.win) {
        windowManager.win?.minimize();
        windowManager.createMiniWindow();
    } else {
        window?.minimize();
    }
}

function handleWindowMaximize(event: Electron.IpcMainEvent, ..._args: unknown[]) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) {
        window?.unmaximize();
    } else {
        window?.maximize();
    }
}

function handleWindowClose(event: Electron.IpcMainEvent, ..._args: unknown[]) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window === windowManager.win) {
        windowManager.win?.hide();
        windowManager.createMiniWindow();
    } else {
        window?.close();
    }
}

function handleUpdateShortcut(_event: Electron.IpcMainEvent, ...args: unknown[]) {
    const [shortcut] = args;
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
}

function handleLauncherCommand(_event: Electron.IpcMainEvent, ...args: unknown[]) {
    const [commandData] = args;
    if (windowManager.win && !windowManager.win.isDestroyed()) {
        windowManager.win.webContents.send("launcher-command-execute", commandData);
    }
}

function handleLauncherDataUpdate(_event: Electron.IpcMainEvent, ...args: unknown[]) {
    const [data] = args;
    if (windowManager.launcherWin && !windowManager.launcherWin.isDestroyed()) {
        windowManager.launcherWin.webContents.send("launcher-data-sync", data);
    }
}

function handleResizeLauncher(_event: Electron.IpcMainEvent, ...args: unknown[]) {
    const [height] = args;
    if (typeof height === 'number' && windowManager.launcherWin && !windowManager.launcherWin.isDestroyed()) {
        windowManager.launcherWin.setContentSize(LAUNCHER_WIDTH, height);
    }
}

export function setupIpcHandlers() {
    const handlers: Record<string, (event: Electron.IpcMainEvent, ...args: unknown[]) => void> = {
        "log-to-file": handleLogToFile,
        "window-minimize": handleWindowMinimize,
        "window-maximize": handleWindowMaximize,
        "window-close": handleWindowClose,
        "window-restore-main": () => windowManager.restoreOrCreateMainWindow(),
        "set-snap-threshold": (event, threshold) => { 
            if (typeof threshold === 'number') windowManager.snapThreshold = threshold; 
        },
        "window-start-drag": (event, offsetX, offsetY) => {
            if (typeof offsetX === 'number' && typeof offsetY === 'number') windowManager.startDrag(offsetX, offsetY);
        },
        "window-drag-tick": () => windowManager.dragTick(),
        "window-end-drag": () => windowManager.endDrag(),
        "update-shortcut": handleUpdateShortcut,
        "hide-launcher": () => {
            if (windowManager.launcherWin) {
                windowManager.launcherWin.hide();
            }
        },
        "launcher-command": handleLauncherCommand,
        "launcher-data-update": handleLauncherDataUpdate,
        "reset-minitracker": () => windowManager.resetMinitracker(),
        "resize-launcher": handleResizeLauncher
    };

    for (const [channel, handler] of Object.entries(handlers)) {
        ipcMain.on(channel, handler);
    }
}
