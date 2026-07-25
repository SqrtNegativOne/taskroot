import { Tray, Menu, nativeImage, app } from "electron";
import { ICON_PATH } from "./constants.js";
import { windowManager } from "./windowManager.js";

let tray: Tray | null = null;

export function createSystemTray() {
    if (tray) return;
    const icon = nativeImage.createFromPath(ICON_PATH);

    tray = new Tray(icon);
    tray.setToolTip("Taskroot");

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Open Taskroot",
            click: () => {
                windowManager.restoreOrCreateMainWindow();
            },
        },
        { type: "separator" },
        {
            label: "Exit",
            click: () => {
                app.exit(0);
            },
        },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        windowManager.restoreOrCreateMainWindow();
    });
}
