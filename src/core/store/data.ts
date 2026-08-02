import { MS_PER_DAY, MINUTES_IN_HOUR } from "../utils/constants";

export const DAYS_IN_WEEK = 7;
export const MONTHS_IN_YEAR = 12;
export const MAX_MONTH_INDEX = 11;

// Sample data + helpers for Taskroot.

export const TODAY = new Date();

export const PAD2 = (n: number | string): string => String(n).padStart(2, "0");
export const ymd = (d: Date): import("../domain/models").YmdString =>
    `${d.getFullYear()}-${PAD2(d.getMonth() + 1)}-${PAD2(d.getDate())}`;
export const parseYMD = (s: string): Date => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};
export const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
export const addDays = (d: Date, n: number): Date => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};
export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfWeek = (d: Date): Date => {
    // Sunday-first
    const x = new Date(d);
    const day = x.getDay(); // 0 = Sun
    x.setDate(x.getDate() - day);
    return x;
};
export const getWeekNumber = (d: Date): number => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const firstWeekStart = startOfWeek(startOfYear);
    const diffDays = Math.round(
        (date.getTime() - firstWeekStart.getTime()) / MS_PER_DAY,
    );
    return Math.floor(diffDays / DAYS_IN_WEEK) + 1;
};
export const minutesToHHMM = (m: number): string =>
    `${PAD2(Math.floor(m / MINUTES_IN_HOUR))}:${PAD2(m % MINUTES_IN_HOUR)}`;
export const hhmmShort = (m: number): string => {
    const h = Math.floor(m / MINUTES_IN_HOUR),
        mm = m % MINUTES_IN_HOUR;
    const h12 = ((h + MAX_MONTH_INDEX) % MONTHS_IN_YEAR) + 1;
    const ap = h < MONTHS_IN_YEAR ? "a" : "p";
    return mm === 0 ? `${h12}${ap}` : `${h12}:${PAD2(mm)}${ap}`;
};
export const durationLabel = (mins: number | undefined | null): string => {
    if (!mins || mins === 0) return "";
    if (mins < MINUTES_IN_HOUR) return `${mins}m`;
    const h = Math.floor(mins / MINUTES_IN_HOUR),
        m = mins % MINUTES_IN_HOUR;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};
export const dueLabel = (dueStr: string | null | undefined, today: Date): string => {
    if (!dueStr) return "";
    const d = parseYMD(dueStr);
    const diff = Math.round((d.getTime() - today.getTime()) / MS_PER_DAY);
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff === -1) return "yesterday";
    if (diff < 0) return `${-diff}d ago`;
    if (diff < DAYS_IN_WEEK) return `${diff}d`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

export const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
export const MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];



export const DEFAULT_STATUSES = [
    { id: "unresolved", label: "Unresolved", color: "var(--tag-red)" },
    { id: "resolving", label: "Resolving", color: "var(--tag-yellow)" },
    { id: "resolved", label: "Resolved", color: "var(--tag-green)" },
];

export const DEFAULT_DISTRACTION_COLUMNS = [
    { id: "name", label: "Name", width: 360, type: "text" },
    { id: "status", label: "Status", width: 160, type: "status" },
    { id: "created", label: "Created", width: 160, type: "datetime" },
];



export const REST_CHECKLIST_DEFAULTS = [
    { id: "r1", title: "Get out of your chair.", type: "check" },
    { id: "r2", title: "Drink water.", type: "check" },
    { id: "r3", title: "Go to the washroom.", type: "check" },
    {
        id: "r4",
        title: "Check your notes for tasks you could not input.",
        type: "check",
    },
    { id: "r5", title: "Brain dump.", type: "check" },
    { id: "r6", title: "Maybe write in your journal.", type: "check" },
];
