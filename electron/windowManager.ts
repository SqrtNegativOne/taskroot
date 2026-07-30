import { BrowserWindow, screen } from "electron";
import { PRELOAD_PATH, ICON_PATH } from "./constants.js";

class WindowManager {
    public win: BrowserWindow | undefined = undefined;
    public miniWin: BrowserWindow | undefined = undefined;
    public isQuitting = false;
    public snapThreshold = 2;
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
            maximizable: false,
            minimizable: false,
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

        let isHovered = false;
        const hoverInterval = setInterval(() => {
            if (!this.miniWin || this.miniWin.isDestroyed()) {
                clearInterval(hoverInterval);
                return;
            }
            const point = screen.getCursorScreenPoint();
            const bounds = this.miniWin.getBounds();
            const hover = point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
                          point.y >= bounds.y && point.y <= bounds.y + bounds.height;
            if (hover !== isHovered) {
                isHovered = hover;
                this.miniWin.webContents.send("minitracker-hover", hover);
            }
        }, 100);

        let moveTimeout: NodeJS.Timeout | undefined = undefined;
        this.miniWin.on("move", () => {
            if (moveTimeout) clearTimeout(moveTimeout);
            
            moveTimeout = setTimeout(() => {
                if (!this.miniWin || this.miniWin.isDestroyed()) return;
                const bounds = this.miniWin.getBounds();
                const display = screen.getDisplayMatching(bounds);
                const workArea = display.workArea;
                const threshold = this.snapThreshold;

                let newX = bounds.x;
                let newY = bounds.y;

                if (Math.abs(newX - workArea.x) <= threshold) {
                    newX = workArea.x;
                } else if (Math.abs(newX + bounds.width - (workArea.x + workArea.width)) <= threshold) {
                    newX = workArea.x + workArea.width - bounds.width;
                }

                if (Math.abs(newY - workArea.y) <= threshold) {
                    newY = workArea.y;
                } else if (Math.abs(newY + bounds.height - (workArea.y + workArea.height)) <= threshold) {
                    newY = workArea.y + workArea.height - bounds.height;
                }

                if (newX !== bounds.x || newY !== bounds.y) {
                    this.miniWin.setPosition(newX, newY);
                    this.miniWin.webContents.send("minitracker-snapped");
                }
            }, 100);
        });

        this.miniWin.on("closed", () => {
            this.miniWin = undefined;
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
