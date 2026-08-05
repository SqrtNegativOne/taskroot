import { MainWindowController } from "./windows/main-window.js";
import { LauncherWindowController } from "./windows/launcher-window.js";
import { MiniWindowController } from "./windows/mini-window.js";

const DEFAULT_SNAP_DISTANCE = 30;
const DEFAULT_SLIDING_SLOWDOWN = 15;

class WindowManager {
    private mainController = new MainWindowController();
    private launcherController = new LauncherWindowController();
    private miniController = new MiniWindowController(() => this.restoreOrCreateMainWindow());

    get win() {
        return this.mainController.win;
    }
    set win(val) {
        this.mainController.win = val;
    }

    get miniWin() {
        return this.miniController.win;
    }

    get launcherWin() {
        return this.launcherController.win;
    }

    get snapThreshold() {
        return this.miniController.dragger?.snapThreshold ?? DEFAULT_SNAP_DISTANCE;
    }
    set snapThreshold(val: number) {
        if (this.miniController.dragger) {
            this.miniController.dragger.snapThreshold = val;
        }
    }

    get snapWindowsDistance() {
        return this.snapThreshold;
    }
    set snapWindowsDistance(val: number) {
        this.snapThreshold = val;
    }

    get slidingAnimationSlowdown() {
        return this.miniController.dragger?.slidingAnimationSlowdown ?? DEFAULT_SLIDING_SLOWDOWN;
    }
    set slidingAnimationSlowdown(val: number) {
        if (this.miniController.dragger) {
            this.miniController.dragger.slidingAnimationSlowdown = val;
        }
    }

    setQuitting(quitting: boolean) {
        this.launcherController.setQuitting(quitting);
        this.miniController.setQuitting(quitting);
    }

    setMainUrl(url: string) {
        this.mainController.setMainUrl(url);
        this.launcherController.setUrl(url);
    }

    setMiniWindowUrl(url: string) {
        this.miniController.setUrl(url);
    }

    restoreOrCreateMainWindow() {
        this.mainController.restoreOrCreateMainWindow();
    }

    createLauncherWindow() {
        this.launcherController.createLauncherWindow();
    }

    toggleLauncher() {
        this.launcherController.toggleLauncher();
    }

    resetMinitracker() {
        this.miniController.resetMinitracker();
    }

    createMiniWindow() {
        this.miniController.createMiniWindow();
    }

    startDrag(offsetX: number, offsetY: number) {
        this.miniController.dragger?.startDrag(offsetX, offsetY);
    }

    dragTick() {
        this.miniController.dragger?.dragTick();
    }

    endDrag() {
        this.miniController.dragger?.endDrag();
    }

    createMainWindow() {
        return this.mainController.createMainWindow();
    }
}

export const windowManager = new WindowManager();
