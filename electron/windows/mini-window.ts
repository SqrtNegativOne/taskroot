import { BrowserWindow } from "electron";
import { PRELOAD_PATH } from "../constants.js";
import { WindowDragger } from "./window-dragger.js";

export const DRAG_START_BOUNDS = { width: 300, height: 100 };

const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    nodeIntegration: false,
    contextIsolation: true,
};

export class MiniWindowController {
    public win?: BrowserWindow;
    public dragger?: WindowDragger;
    private isQuitting = false;
    private url = "";
    private onMaximize: () => void;

    constructor(onMaximize: () => void) {
        this.onMaximize = onMaximize;
    }

    setQuitting(quitting: boolean) {
        this.isQuitting = quitting;
    }

    setUrl(url: string) {
        this.url = url;
    }

    createMiniWindow() {
        if (this.win) return;
        if (!this.url) return;

        this.win = new BrowserWindow({
            width: DRAG_START_BOUNDS.width,
            height: DRAG_START_BOUNDS.height,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            maximizable: false,
            minimizable: false,
            resizable: true,
            skipTaskbar: true,
            webPreferences: defaultWebPreferences,
        });

        this.dragger = new WindowDragger(this.win, DRAG_START_BOUNDS);

        void this.win.loadURL(this.url);

        this.win.on("close", (e) => {
            if (!this.isQuitting) {
                e.preventDefault();
            }
        });

        this.win.on("closed", () => {
            this.win = undefined;
            this.dragger = undefined;
        });

        this.win.on("maximize", () => {
            this.onMaximize();
        });
    }

    resetMinitracker() {
        if (this.win && !this.win.isDestroyed()) {
            this.win.setBounds({
                width: DRAG_START_BOUNDS.width,
                height: DRAG_START_BOUNDS.height
            });
            this.win.center();
        }
    }
}
