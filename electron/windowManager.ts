import { BrowserWindow, screen } from "electron";
import { PRELOAD_PATH, ICON_PATH } from "./constants.js";

const DEFAULT_SNAP_DISTANCE = 25;
const DEFAULT_SLIDING_SLOWDOWN = 15;

class WindowManager {
    public win?: BrowserWindow;
    public miniWin?: BrowserWindow;
    public isQuitting = false;
    public snapThreshold: number = 30;
    
    // Smooth custom drag state
    private clickOffsetX: number = 0;
    private clickOffsetY: number = 0;
    private dragHistory: {x: number, y: number, time: number}[] = [];
    private dragStartBounds = { width: 300, height: 100 };
    private slideTimer?: NodeJS.Timeout;
    private mainUrl = "";
    private miniWindowUrl = "";
    
    // Windhawk Slick Window Arrangement Settings
    public snapWindowsDistance = DEFAULT_SNAP_DISTANCE;
    public slidingAnimationSlowdown = DEFAULT_SLIDING_SLOWDOWN;

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
            maximizable: false,
            minimizable: false,
            resizable: true,
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
            this.miniWin = undefined;
        });

        this.miniWin.on("maximize", () => {
            this.restoreOrCreateMainWindow();
        });
    }

    startDrag(offsetX: number, offsetY: number) {
        if (this.slideTimer) {
            clearInterval(this.slideTimer);
            this.slideTimer = undefined;
        }
        this.clickOffsetX = offsetX;
        this.clickOffsetY = offsetY;
        this.dragHistory = [];
        if (this.miniWin) {
            const bounds = this.miniWin.getBounds();
            this.dragStartBounds = { width: bounds.width, height: bounds.height };
        }
    }

    dragTick() {
        if (!this.miniWin || this.miniWin.isDestroyed()) return;
        
        const point = screen.getCursorScreenPoint();
        const newX = point.x - this.clickOffsetX;
        const newY = point.y - this.clickOffsetY;
        
        const now = Date.now();
        this.dragHistory.push({ x: newX, y: newY, time: now });
        // Only keep the last 100ms of history for accurate velocity
        this.dragHistory = this.dragHistory.filter(p => now - p.time < 100);
        
        const w = this.dragStartBounds.width;
        const h = this.dragStartBounds.height;
        const snapped = this.applySnapping(newX, newY, w, h);
        this.miniWin.setBounds({ x: snapped.x, y: snapped.y, width: w, height: h });
    }

    endDrag() {
        if (!this.miniWin || this.miniWin.isDestroyed()) return;
        
        if (this.dragHistory.length < 2) return;
        
        const first = this.dragHistory[0];
        const last = this.dragHistory[this.dragHistory.length - 1];
        
        const dt = Math.max(1, last.time - first.time);
        // Average velocity pixels per second
        let vx = ((last.x - first.x) / dt) * 1000.0;
        let vy = ((last.y - first.y) / dt) * 1000.0;
        
        this.dragHistory = []; // Reset history
        
        if (this.slideTimer) {
            clearInterval(this.slideTimer);
            this.slideTimer = undefined;
        }

        const bounds = this.miniWin.getBounds();
        let preciseX = bounds.x;
        let preciseY = bounds.y;
        
        const frameTime = 16;
        const MILLISECONDS_IN_SECOND = 1000.0;
        const FULL_PERCENTAGE = 100.0;
        const STOP_VELOCITY_THRESHOLD = 5;
        
        this.slideTimer = setInterval(() => {
            if (!this.miniWin || this.miniWin.isDestroyed()) {
                if (this.slideTimer) clearInterval(this.slideTimer);
                return;
            }
            
            preciseX += vx / (MILLISECONDS_IN_SECOND / frameTime);
            preciseY += vy / (MILLISECONDS_IN_SECOND / frameTime);
            
            let newX = preciseX;
            let newY = preciseY;
            
            const slowdownMultiplier = (FULL_PERCENTAGE - this.slidingAnimationSlowdown) / FULL_PERCENTAGE;
            vx *= slowdownMultiplier;
            vy *= slowdownMultiplier;
            
            const w = this.dragStartBounds.width;
            const h = this.dragStartBounds.height;
            const snapped = this.applySnapping(newX, newY, w, h);
            
            // Hard clamp during slide to prevent sliding off screen
            const currentDisplay = screen.getDisplayMatching({ x: snapped.x, y: snapped.y, width: w, height: h });
            const workArea = currentDisplay.workArea;
            
            if (snapped.x < workArea.x) {
                snapped.x = workArea.x;
            } else if (snapped.x + w > workArea.x + workArea.width) {
                snapped.x = workArea.x + workArea.width - w;
            }
            
            if (snapped.y < workArea.y) {
                snapped.y = workArea.y;
            } else if (snapped.y + h > workArea.y + workArea.height) {
                snapped.y = workArea.y + workArea.height - h;
            }
            
            if (snapped.x !== newX) {
                vx = 0;
                preciseX = snapped.x;
            }
            if (snapped.y !== newY) {
                vy = 0;
                preciseY = snapped.y;
            }
            
            newX = snapped.x;
            newY = snapped.y;
            
            if (Math.abs(vx) < STOP_VELOCITY_THRESHOLD && Math.abs(vy) < STOP_VELOCITY_THRESHOLD) {
                if (this.slideTimer) clearInterval(this.slideTimer);
                this.slideTimer = undefined;
            }
            
            this.miniWin.setBounds({ x: newX, y: newY, width: w, height: h });
        }, frameTime);
    }
    
    private applySnapping(x: number, y: number, w: number, h: number) {
        let snapX = x;
        let snapY = y;
        
        const displays = screen.getAllDisplays();
        for (const d of displays) {
            const workArea = d.workArea;
            
            if (Math.abs(x - workArea.x) < this.snapWindowsDistance) {
                snapX = workArea.x;
            } else if (Math.abs((x + w) - (workArea.x + workArea.width)) < this.snapWindowsDistance) {
                snapX = workArea.x + workArea.width - w;
            }
            
            if (Math.abs(y - workArea.y) < this.snapWindowsDistance) {
                snapY = workArea.y;
            } else if (Math.abs((y + h) - (workArea.y + workArea.height)) < this.snapWindowsDistance) {
                snapY = workArea.y + workArea.height - h;
            }
        }
        
        return { x: snapX, y: snapY };
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
