
import { BrowserWindow, screen, type Rectangle } from "electron";
import { PRELOAD_PATH, ICON_PATH } from "./constants.js";

const DEFAULT_SNAP_DISTANCE = 30;
const DEFAULT_SLIDING_SLOWDOWN = 15;
const DRAG_START_BOUNDS = { width: 300, height: 100 };
const MILLISECONDS_IN_SECOND = 1000.0;
const FRAME_TIME = 16;
const FULL_PERCENTAGE = 100.0;
const STOP_VELOCITY_THRESHOLD = 5;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    nodeIntegration: false,
    contextIsolation: true,
};

class WindowManager {
    public win?: BrowserWindow;
    public miniWin?: BrowserWindow;
    public isQuitting = false;
    public snapThreshold: number = DEFAULT_SNAP_DISTANCE;
    
    // Smooth custom drag state
    private clickOffsetX: number = 0;
    private clickOffsetY: number = 0;
    private dragHistory: {x: number, y: number, time: number}[] = [];
    private dragStartBounds = DRAG_START_BOUNDS;
    private slideTimer?: NodeJS.Timeout;
    private mainUrl = "";
    private miniWindowUrl = "";
    
    // Slick Window Arrangement Settings
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

    private get isMiniWinReady() {
        return this.miniWin && !this.miniWin.isDestroyed();
    }

    private stopSlide() {
        if (this.slideTimer) {
            clearInterval(this.slideTimer);
            this.slideTimer = undefined;
        }
    }

    startDrag(offsetX: number, offsetY: number) {
        this.stopSlide();
        this.clickOffsetX = offsetX;
        this.clickOffsetY = offsetY;
        this.dragHistory = [];
        if (this.miniWin) {
            const bounds = this.miniWin.getBounds();
            this.dragStartBounds = { width: bounds.width, height: bounds.height };
        }
    }

    dragTick() {
        if (!this.isMiniWinReady) return;
        
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
        this.miniWin?.setBounds({ x: snapped.x, y: snapped.y, width: w, height: h });
    }

    endDrag() {
        if (!this.isMiniWinReady || this.dragHistory.length < 2) return;
        
        const first = this.dragHistory[0];
        const last = this.dragHistory[this.dragHistory.length - 1];
        
        const dt = Math.max(1, last.time - first.time);
        const vx = ((last.x - first.x) / dt) * MILLISECONDS_IN_SECOND;
        const vy = ((last.y - first.y) / dt) * MILLISECONDS_IN_SECOND;
        
        this.dragHistory = []; // Reset history
        this.stopSlide();

        const bounds = this.miniWin?.getBounds();
        if (bounds) {
            this.startSlideAnimation(bounds, { vx, vy });
        }
    }

    private startSlideAnimation(bounds: Rectangle, velocity: { vx: number, vy: number }) {
        let preciseX = bounds.x;
        let preciseY = bounds.y;
        let { vx, vy } = velocity;
        const w = this.dragStartBounds.width;
        const h = this.dragStartBounds.height;
        
        this.slideTimer = setInterval(() => {
            if (!this.isMiniWinReady) {
                this.stopSlide();
                return;
            }
            
            preciseX += vx / (MILLISECONDS_IN_SECOND / FRAME_TIME);
            preciseY += vy / (MILLISECONDS_IN_SECOND / FRAME_TIME);
            
            const slowdownMultiplier = (FULL_PERCENTAGE - this.slidingAnimationSlowdown) / FULL_PERCENTAGE;
            vx *= slowdownMultiplier;
            vy *= slowdownMultiplier;
            
            const snapped = this.applySnapping(preciseX, preciseY, w, h);
            
            // Hard clamp during slide to prevent sliding off screen
            const currentDisplay = screen.getDisplayMatching({ x: snapped.x, y: snapped.y, width: w, height: h });
            const workArea = currentDisplay.workArea;
            
            const newX = clamp(snapped.x, workArea.x, workArea.x + workArea.width - w);
            const newY = clamp(snapped.y, workArea.y, workArea.y + workArea.height - h);
            
            if (newX !== preciseX) {
                vx = 0;
                preciseX = newX;
            }
            if (newY !== preciseY) {
                vy = 0;
                preciseY = newY;
            }
            
            if (Math.abs(vx) < STOP_VELOCITY_THRESHOLD && Math.abs(vy) < STOP_VELOCITY_THRESHOLD) {
                this.stopSlide();
            }
            
            this.miniWin?.setBounds({ x: newX, y: newY, width: w, height: h });
        }, FRAME_TIME);
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
            webPreferences: defaultWebPreferences,
            autoHideMenuBar: true,
        });

        this.win.once("ready-to-show", () => {
            this.win?.show();
        });

        return this.win;
    }
}

export const windowManager = new WindowManager();
