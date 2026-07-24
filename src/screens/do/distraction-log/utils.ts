import { MONTHS } from "../../../core/store/data";

export function colIcon(type: string) {
    return ({ text: "A", status: "◐", datetime: "◷" } as Record<string, string>)[type] || "·";
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
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
