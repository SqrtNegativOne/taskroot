import { app, globalShortcut } from "electron";
import path from "node:path";
import { VITE_DEV_SERVER_URL } from "./constants.js";
import { windowManager } from "./windowManager.js";
import { setupIpcHandlers } from "./ipc.js";
import { createSystemTray } from "./tray.js";
import { startLocalServer } from "./server.js";



let localServer: import("http").Server | undefined = undefined;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient("taskroot", process.execPath, [
            path.resolve(process.argv[1]),
        ]);
    }
} else {
    app.setAsDefaultProtocolClient("taskroot");
}

function handleDeepLink(url: string) {
    if (!url.startsWith("taskroot://")) return;
    const route = url.replace("taskroot://", "").replace(/\/$/, "");
    const win = windowManager.win;
    if (win && !win.isDestroyed() && route) {
        win.webContents.send("deep-link", route);
    }
}

app.on("second-instance", (event, commandLine) => {
    windowManager.restoreOrCreateMainWindow();
    const url = commandLine.find((arg) => arg.startsWith("taskroot://"));
    if (url) {
        handleDeepLink(url);
    }
});

// macOS deep link handling
app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
});

function initializeApp() {
    setupIpcHandlers();
    createSystemTray();

    const win = windowManager.createMainWindow();

    if (VITE_DEV_SERVER_URL) {
        windowManager.setMainUrl(VITE_DEV_SERVER_URL);
        windowManager.setMiniWindowUrl(`${VITE_DEV_SERVER_URL}?minitracker=true`);
        win.loadURL(VITE_DEV_SERVER_URL);
        windowManager.createMiniWindow();
        windowManager.createLauncherWindow();
    } else {
        localServer = startLocalServer((port: number) => {
            const mainUrl = `http://localhost:${port}`;
            windowManager.setMainUrl(mainUrl);
            windowManager.setMiniWindowUrl(`${mainUrl}?minitracker=true`);
            win.loadURL(mainUrl);
            windowManager.createMiniWindow();
            windowManager.createLauncherWindow();
        });
    }
}

app.whenReady().then(() => {
    initializeApp();

    const url = process.argv.find((arg) => arg.startsWith("taskroot://"));
    if (url) {
        const win = windowManager.win;
        if (win && !win.isDestroyed()) {
            win.webContents.once("did-finish-load", () => {
                handleDeepLink(url);
            });
        }
    }
    return undefined;
}).catch(console.error);

app.on("before-quit", () => {
    windowManager.setQuitting(true);
});

app.on("will-quit", () => {
    if (localServer) {
        localServer.close();
    }
    globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        windowManager.win = undefined;
    }
});

app.on("activate", () => {
    import("electron").then((e) => {
        if (e.BrowserWindow.getAllWindows().length === 0) {
            windowManager.restoreOrCreateMainWindow();
        }
        return undefined;
    }).catch(console.error);
});
