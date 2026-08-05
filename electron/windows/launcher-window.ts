import { BrowserWindow, screen } from "electron";
import { PRELOAD_PATH } from "../constants.js";

const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    nodeIntegration: false,
    contextIsolation: true,
};

export class LauncherWindowController {
    public win?: BrowserWindow;
    private isQuitting = false;
    private url = "";

    setQuitting(quitting: boolean) {
        this.isQuitting = quitting;
    }

    setUrl(url: string) {
        this.url = url;
    }

    createLauncherWindow() {
        if (this.win) return;
        if (!this.url) return;

        this.win = new BrowserWindow({
            width: 640,
            height: 56, // grows as results populate
            frame: false,
            transparent: true,
            resizable: false,
            show: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            webPreferences: defaultWebPreferences,
        });

        this.win.loadURL(`${this.url}?launcher=true`);

        this.win.on('blur', () => {
            this.win?.hide();
        });

        this.win.on("close", (e) => {
            if (!this.isQuitting) {
                e.preventDefault();
            }
        });

        this.win.on("closed", () => {
            this.win = undefined;
        });
    }

    toggleLauncher() {
        if (!this.win || this.win.isDestroyed()) {
            this.createLauncherWindow();
        }

        if (this.win?.isVisible()) {
            this.win.hide();
        } else if (this.win) {
            const point = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(point);
            const winBounds = this.win.getBounds();

            const x = Math.round(display.workArea.x + (display.workArea.width / 2) - (winBounds.width / 2));
            const y = Math.round(display.workArea.y + (display.workArea.height / 2) - (winBounds.height / 2));

            this.win.setPosition(x, y);
            this.win.show();
            this.win.focus();
        }
    }
}
