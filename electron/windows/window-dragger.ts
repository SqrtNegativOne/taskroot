import { BrowserWindow, screen, type Rectangle } from "electron";

const DEFAULT_SNAP_DISTANCE = 30;
const DEFAULT_SLIDING_SLOWDOWN = 15;
const MILLISECONDS_IN_SECOND = 1000.0;
const FRAME_TIME = 16;
const FULL_PERCENTAGE = 100.0;
const STOP_VELOCITY_THRESHOLD = 5;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

export class WindowDragger {
    private win: BrowserWindow;
    public snapThreshold = DEFAULT_SNAP_DISTANCE;
    public slidingAnimationSlowdown = DEFAULT_SLIDING_SLOWDOWN;
    
    private clickOffsetX = 0;
    private clickOffsetY = 0;
    private dragHistory: {x: number, y: number, time: number}[] = [];
    private dragStartBounds = { width: 300, height: 100 };
    private slideTimer?: NodeJS.Timeout;

    constructor(win: BrowserWindow, startBounds: { width: number, height: number }) {
        this.win = win;
        this.dragStartBounds = startBounds;
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
        if (!this.win.isDestroyed()) {
            const bounds = this.win.getBounds();
            this.dragStartBounds = { width: bounds.width, height: bounds.height };
        }
    }

    dragTick() {
        if (this.win.isDestroyed()) return;
        
        const point = screen.getCursorScreenPoint();
        const newX = point.x - this.clickOffsetX;
        const newY = point.y - this.clickOffsetY;
        
        const now = Date.now();
        this.dragHistory.push({ x: newX, y: newY, time: now });
        this.dragHistory = this.dragHistory.filter(p => now - p.time < 100);
        
        const w = this.dragStartBounds.width;
        const h = this.dragStartBounds.height;
        const snapped = this.applySnapping(newX, newY, w, h);
        this.win.setBounds({ x: snapped.x, y: snapped.y, width: w, height: h });
    }

    endDrag() {
        if (this.win.isDestroyed() || this.dragHistory.length < 2) return;
        
        const first = this.dragHistory[0];
        const last = this.dragHistory[this.dragHistory.length - 1];
        
        const dt = Math.max(1, last.time - first.time);
        const vx = ((last.x - first.x) / dt) * MILLISECONDS_IN_SECOND;
        const vy = ((last.y - first.y) / dt) * MILLISECONDS_IN_SECOND;
        
        this.dragHistory = [];
        this.stopSlide();

        const bounds = this.win.getBounds();
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
            if (this.win.isDestroyed()) {
                this.stopSlide();
                return;
            }
            
            preciseX += vx / (MILLISECONDS_IN_SECOND / FRAME_TIME);
            preciseY += vy / (MILLISECONDS_IN_SECOND / FRAME_TIME);
            
            const slowdownMultiplier = (FULL_PERCENTAGE - this.slidingAnimationSlowdown) / FULL_PERCENTAGE;
            vx *= slowdownMultiplier;
            vy *= slowdownMultiplier;
            
            const snapped = this.applySnapping(preciseX, preciseY, w, h);
            
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
            
            this.win.setBounds({ x: newX, y: newY, width: w, height: h });
        }, FRAME_TIME);
    }
    
    private applySnapping(x: number, y: number, w: number, h: number) {
        let snapX = x;
        let snapY = y;
        
        const displays = screen.getAllDisplays();
        for (const d of displays) {
            const workArea = d.workArea;
            
            if (Math.abs(x - workArea.x) < this.snapThreshold) {
                snapX = workArea.x;
            } else if (Math.abs((x + w) - (workArea.x + workArea.width)) < this.snapThreshold) {
                snapX = workArea.x + workArea.width - w;
            }
            
            if (Math.abs(y - workArea.y) < this.snapThreshold) {
                snapY = workArea.y;
            } else if (Math.abs((y + h) - (workArea.y + workArea.height)) < this.snapThreshold) {
                snapY = workArea.y + workArea.height - h;
            }
        }
        
        return { x: snapX, y: snapY };
    }
}
