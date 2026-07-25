import { fileURLToPath } from "node:url";
import path from "node:path";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.join(__dirname, "..");
process.env.APP_ROOT = APP_ROOT;

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(APP_ROOT, "dist");

export const VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(APP_ROOT, "public")
    : RENDERER_DIST;
process.env.VITE_PUBLIC = VITE_PUBLIC;

export const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
export const ICON_PATH = path.join(VITE_PUBLIC, "icon.png");
