import { MONTHS } from "../../../core/store/data";

export const MAX_DISPLAY_ITEMS = 6;
export const DRAG_THRESHOLD_PX = 4;


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
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, DRAG_THRESHOLD_PX), 16);
    const b = parseInt(h.slice(DRAG_THRESHOLD_PX, MAX_DISPLAY_ITEMS), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
