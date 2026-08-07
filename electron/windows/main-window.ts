import { BrowserWindow } from "electron";
import { PRELOAD_PATH, ICON_PATH } from "../constants.js";

const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    nodeIntegration: false,
    contextIsolation: true,
};

export class MainWindowController {
    public win?: BrowserWindow;
    private mainUrl = "";

    setMainUrl(url: string) {
        this.mainUrl = url;
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
            webPreferences: defaultWebPreferences,
            autoHideMenuBar: true,
        });

        this.win.once("ready-to-show", () => {
            this.win?.show();
        });

        return this.win;
    }

    restoreOrCreateMainWindow() {
        if (this.win && !this.win.isDestroyed()) {
            if (this.win.isMinimized()) this.win.restore();
            this.win.show();
            this.win.focus();
        } else {
            this.createMainWindow();
            if (this.mainUrl) {
                void this.win?.loadURL(this.mainUrl);
            }
        }
    }
}
