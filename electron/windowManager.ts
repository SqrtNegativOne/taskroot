import { BrowserWindow } from "electron";
import { PRELOAD_PATH, ICON_PATH } from "./constants.js";

class WindowManager {
    public win: BrowserWindow | null = null;
    public miniWin: BrowserWindow | null = null;
    public isQuitting = false;
    private mainUrl = "";
    private miniWindowUrl = "";

    setQuitting(quitting: boolean) {
        this.isQuitting = quitting;
    }

    setMainUrl(url: string) {
        this.mainUrl = url;
    }

    setMiniWindowUrl(url: string) {
        this.miniWindowUrl = url;
    }

    restoreOrCreateMainWindow() {
        if (this.win && !this.win.isDestroyed()) {
            if (this.win.isMinimized()) this.win.restore();
            this.win.show();
            this.win.focus();
        } else {
            this.createMainWindow();
            if (this.mainUrl) {
                this.win?.loadURL(this.mainUrl);
            }
        }
    }

    createMiniWindow() {
        if (this.miniWin) return;
        if (!this.miniWindowUrl) return;

        this.miniWin = new BrowserWindow({
            width: 300,
            height: 100,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                preload: PRELOAD_PATH,
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        this.miniWin.loadURL(this.miniWindowUrl);

        this.miniWin.on("close", (e) => {
            if (!this.isQuitting) {
                e.preventDefault();
            }
        });

        this.miniWin.on("closed", () => {
            this.miniWin = null;
        });

        this.miniWin.on("maximize", () => {
            this.restoreOrCreateMainWindow();
        });
    }

    createMainWindow() {
        if (this.win && !this.win.isDestroyed()) return this.win;

        this.win = new BrowserWindow({
            width: 1200,
            height: 800,
            frame: false,
            show: false,
            backgroundColor: "#2c2d2d",
            icon: ICON_PATH,
            webPreferences: {
                preload: PRELOAD_PATH,
                nodeIntegration: false,
                contextIsolation: true,
            },
            autoHideMenuBar: true,
        });

        this.win.once("ready-to-show", () => {
            this.win?.show();
        });

        return this.win;
    }
}

export const windowManager = new WindowManager();
