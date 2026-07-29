import { MONTHS } from "../../../core/store/data";

export const MAX_DISPLAY_ITEMS = 6;
export const DRAG_THRESHOLD_PX = 4;
const HEX_R_START = 0;
const HEX_R_END = 2;
const HEX_G_START = 2;
const HEX_G_END = 4;
const HEX_B_START = 4;
const HEX_B_END = 6;


export function colIcon(type: string) {
    return ({ text: "A", status: "◐", datetime: "◷" })[type] || "·";
}

export function formatDateTime(s?: string) {
    if (!s) return "";
    const [date, time] = s.split("T");
    if (!date) return "";
    const [, m, d] = date.split("-");
    if (!m || !d) return "";
    return `${MONTHS[parseInt(m, 10) - 1]?.toLowerCase() || ""} ${parseInt(d, 10)} · ${time || ""}`;
}

export function hexAlpha(hex: string, alpha: number) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(HEX_R_START, HEX_R_END), 16);
    const g = parseInt(h.slice(HEX_G_START, HEX_G_END), 16);
    const b = parseInt(h.slice(HEX_B_START, HEX_B_END), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
