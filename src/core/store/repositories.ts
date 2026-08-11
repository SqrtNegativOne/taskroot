import { ArrayRepository } from "./array-repository";

import { SETTINGS_SCHEMA, DEFAULT_SETTINGS } from "./settingsSchema";
import type { AppSettings } from "./settingsSchema";
import type { AppTask, AppEvent, AppNote } from "../domain/models";
import { DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, REST_CHECKLIST_DEFAULTS } from "./data";

export interface DistractionRow { readonly id: string; readonly [key: string]: unknown; }
export interface DistractionStatus { readonly id: string; readonly label: string; readonly color: string; }
export interface DistractionColumn { readonly id: string; readonly label: string; readonly width: number; readonly type: string; }
export interface StopwatchState { readonly elapsed: number; readonly runningSince?: number | undefined; readonly isBreak: boolean; readonly breakAllowedMs: number; readonly breakStartedAt?: number | undefined; readonly breakSoundPlayed: boolean; }
export type TimeLog = AppEvent;
export interface RestItem { readonly id: string; readonly title: string; readonly type: string; readonly checked?: boolean; }
export interface CalendarData { readonly id: string; readonly summary: string; readonly active: boolean; readonly accessRole?: string; readonly backgroundColor?: string; readonly foregroundColor?: string; readonly primary?: boolean; }
export interface TestKeyData { readonly count: number; }

export { Repository } from "./repository";
import { Repository } from "./repository";

function injectUpdatedAt<T extends { id?: string; updatedAt?: number | undefined }>(result: T[], prev?: T[]): T[] {
    if (!Array.isArray(result)) return result;

    let mutated = false;
    const mapped = result.map((newItem) => {
        if (!newItem?.id) return newItem;

        if (!prev) {
            if (newItem.updatedAt) return newItem;
            mutated = true;
            return Object.assign({}, newItem, { updatedAt: Date.now() });
        }

        const oldItem = prev.find((o) => o.id === newItem.id);
        const { updatedAt: _o, ...oldRest } = oldItem || {};
        const { updatedAt: _n, ...newRest } = newItem;
        
        if (oldItem && JSON.stringify(oldRest) === JSON.stringify(newRest)) {
            return newItem;
        }

        mutated = true;
        return Object.assign({}, newItem, { updatedAt: Date.now() });
    });

    return mutated ? mapped : result;
}

function isRecord(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === "object" && obj !== null;
}

function parseSettings(parsed: unknown): AppSettings {
    const result: AppSettings = { ...DEFAULT_SETTINGS };
    if (!isRecord(parsed)) return result;

    for (const s of SETTINGS_SCHEMA) {
        if (!(s.id in parsed)) continue;
        let val = parsed[s.id];
        if (s.type === "number") {
            let numVal = Number(val);
            if (s.min !== undefined && numVal < s.min) numVal = s.min;
            if (s.max !== undefined && numVal > s.max) numVal = s.max;
            val = numVal;
        } else if (s.type === "checkbox") {
            val = Boolean(val);
        }
        Object.assign(result, { [s.id]: val });
    }
    return result;
}

function propagateTaskTitleToEvents(next: AppTask[], prev: AppTask[]) {
    const renamedTasks = next.filter((task) => {
        const old = prev.find((t) => t.id === task.id);
        return old && old.title !== task.title;
    });
    if (renamedTasks.length === 0) return;

    const titleById = new Map(renamedTasks.map((t) => [t.id, t.title]));
    const eventsRes = repos.events.get();
    const events = eventsRes.isOk() ? eventsRes.value : repos.events.initial;
    
    const updated = events.map((ev) => {
        const newTitle = ev.taskId ? titleById.get(ev.taskId) : undefined;
        return newTitle !== undefined ? Object.assign({}, ev, { title: newTitle }) : ev;
    });
    repos.events.set(updated);
}

function onTasksDelta(result: AppTask[], prev?: AppTask[]) {
    if (prev) propagateTaskTitleToEvents(result, prev);
}

function parseEvents(parsed: unknown): AppEvent[] {
    if (!Array.isArray(parsed)) return [];
    
    const events: AppEvent[] = parsed.filter((ev): ev is AppEvent => isRecord(ev));
    
    return events;
}

export const repos = {
    settings: new Repository<AppSettings>("settings", DEFAULT_SETTINGS, { parser: parseSettings }),
    tasks: new ArrayRepository<AppTask>("tasks", [], { interceptor: (next, prev) => injectUpdatedAt<AppTask>(next, prev), onDelta: onTasksDelta }),
    events: new ArrayRepository<AppEvent>("events", [], { parser: parseEvents, interceptor: (next, prev) => injectUpdatedAt<AppEvent>(next, prev) }),
    distractions: new Repository<DistractionRow[]>("distractions", []),
    distractionStatuses: new Repository<DistractionStatus[]>("distractionStatuses", DEFAULT_STATUSES),
    distractionColumns: new Repository<DistractionColumn[]>("distractionColumns", DEFAULT_DISTRACTION_COLUMNS),
    stopwatch: new Repository<StopwatchState>("stopwatch", {
        elapsed: 0,
        runningSince: undefined,
        isBreak: false,
        breakAllowedMs: 0,
        breakStartedAt: undefined,
        breakSoundPlayed: false,
    }),
    time_logs: new Repository<TimeLog[]>("time_logs", []),
    tips: new Repository<string[]>("tips", []),
    notes: new Repository<AppNote[]>("notes", []),
    taskQuery: new Repository<string>("taskQuery", ""),
    taskFilters: new Repository<import('../domain/models').AppFilter[]>("taskFilters", [{ id: "default-not-done", column: "status", operator: "is not", value: "done" }]),
    taskSort: new Repository<string>("taskSort", "priority"),
    restItems: new Repository<RestItem[]>("restItems", REST_CHECKLIST_DEFAULTS),
    test_key: new Repository<TestKeyData>("test_key", { count: 0 }),
    calFilters: new Repository<import('../domain/models').AppFilter[]>("calFilters", []),
    calSort: new Repository<string>("calSort", "time"),
    timeFilters: new Repository<import('../domain/models').AppFilter[]>("timeFilters", []),
    timeSort: new Repository<string>("timeSort", "time"),
    calendars: new Repository<CalendarData[]>("calendars", [{ id: "primary", summary: "Primary", active: true, primary: true }])
} as const;

export const VALID_STORE_KEYS = [
    "settings", "tasks", "events", "distractions", "distractionStatuses", "distractionColumns",
    "stopwatch", "time_logs", "tips", "notes", "taskQuery", "taskFilters", "taskSort",
    "restItems", "test_key", "calFilters", "calSort", "timeFilters", "timeSort", "calendars",
    "sync_queue"
] as const;

export type StoreKey = (typeof VALID_STORE_KEYS)[number];

export function purgeOrphanedData(
    notify?: (msg: string, type: "error" | "success" | "info") => void,
) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("taskroot_")) continue;
        const rawKey = key.replace("taskroot_", "");
        if (!VALID_STORE_KEYS.some((k) => k === rawKey)) {
            keysToRemove.push(key);
        }
    }
    
    if (keysToRemove.length === 0) return;

    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (notify) {
        notify(`Removed ${keysToRemove.length} orphaned store item(s).`, "error");
    }
}
