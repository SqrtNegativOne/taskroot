import { storeRegistry } from "./storeRegistry";
import { taskSync, eventSync, pusher } from "../sync";
import { SETTINGS_SCHEMA, DEFAULT_SETTINGS } from "./settingsSchema";
import type { AppSettings } from "./settingsSchema";
import type { AppTask, AppEvent } from "../domain/models";
import { DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, REST_CHECKLIST_DEFAULTS } from "./data";

export interface DistractionRow { id: string; [key: string]: unknown; }
export interface DistractionStatus { id: string; label: string; color: string; }
export interface DistractionColumn { id: string; label: string; width: number; type: string; }
export interface StopwatchState { elapsed: number; runningSince: number | null; isBreak: boolean; breakAllowedMs: number; breakStartedAt: number | null; breakSoundPlayed: boolean; }
export interface TimeLog { id?: string; taskId?: string | null; duration: number; date: string; }
export interface RestItem { id: string; title: string; type: string; checked?: boolean; }
export interface CalendarData { id: string; summary: string; active: boolean; accessRole?: string; }
export interface TestKeyData { count: number; }

export class Repository<T> {
    public key: string;
    private initial: T;
    private parser?: (saved: unknown) => T;
    private interceptor?: (next: T, prev?: T) => T;
    private onDelta?: (result: T) => void;

    constructor(
        key: string,
        initial: T,
        parser?: (saved: unknown) => T,
        interceptor?: (next: T, prev?: T) => T,
        onDelta?: (result: T) => void
    ) {
        this.key = key;
        this.initial = initial;
        this.parser = parser;
        this.interceptor = interceptor;
        this.onDelta = onDelta;
    }

    get(): T {
        try {
            const saved = localStorage.getItem(`taskroot_${this.key}`);
            const parsed = saved ? JSON.parse(saved) : this.initial;
            if (this.parser) return this.parser(parsed);
            return parsed;
        } catch (e) {
            if (this.parser) return this.parser(this.initial);
            return this.initial;
        }
    }

    set(newValOrUpdater: T | ((prev: T) => T)): T {
        const prev = this.get();
        const next = newValOrUpdater instanceof Function ? newValOrUpdater(prev) : newValOrUpdater;
        const mutated = this.interceptor ? this.interceptor(next, prev) : next;
        
        storeRegistry.setLocalData(this.key, mutated);
        
        if (this.onDelta) {
            this.onDelta(mutated);
        }
        return mutated;
    }
}

function injectUpdatedAt<T extends { id?: string; updatedAt?: number }>(result: T[], prev?: T[]): T[] {
    if (!Array.isArray(result)) return result;

    let mutated = false;
    const mapped = result.map((newItem) => {
        if (!newItem || !newItem.id) return newItem;

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

function parseSettings(parsed: any): AppSettings {
    const result: AppSettings = { ...DEFAULT_SETTINGS };
    if (!parsed || typeof parsed !== "object") return result;

    for (const s of SETTINGS_SCHEMA) {
        if (!(s.id in parsed)) continue;
        let val = (parsed as any)[s.id];
        if (s.type === "number") {
            val = Number(val);
            if (s.min !== undefined && val < s.min) val = s.min;
            if (s.max !== undefined && val > s.max) val = s.max;
        } else if (s.type === "checkbox") {
            val = Boolean(val);
        }
        Object.assign(result, { [s.id]: val });
    }
    return result;
}

function onTasksDelta(result: AppTask[]) {
    taskSync.computeTasksDelta(result);
    pusher.trigger();
}

function onEventsDelta(result: AppEvent[]) {
    eventSync.computeEventsDelta(result);
    pusher.trigger();
}

export const repos = {
    settings: new Repository<AppSettings>("settings", DEFAULT_SETTINGS, parseSettings),
    tasks: new Repository<AppTask[]>("tasks", [], undefined, injectUpdatedAt, onTasksDelta),
    events: new Repository<AppEvent[]>("events", [], undefined, injectUpdatedAt, onEventsDelta),
    distractions: new Repository<DistractionRow[]>("distractions", []),
    distractionStatuses: new Repository<DistractionStatus[]>("distractionStatuses", DEFAULT_STATUSES as DistractionStatus[]),
    distractionColumns: new Repository<DistractionColumn[]>("distractionColumns", DEFAULT_DISTRACTION_COLUMNS as DistractionColumn[]),
    stopwatch: new Repository<StopwatchState>("stopwatch", {
        elapsed: 0,
        runningSince: null,
        isBreak: false,
        breakAllowedMs: 0,
        breakStartedAt: null,
        breakSoundPlayed: false,
    }),
    time_logs: new Repository<TimeLog[]>("time_logs", []),
    tips: new Repository<string[]>("tips", []),
    notes: new Repository<string[]>("notes", []),
    taskQuery: new Repository<string>("taskQuery", ""),
    taskFilters: new Repository<import('../domain/models').AppFilter[]>("taskFilters", [{ id: "default-not-done", column: "status", operator: "is not", value: "done" }]),
    taskSort: new Repository<string>("taskSort", "priority"),
    restItems: new Repository<RestItem[]>("restItems", REST_CHECKLIST_DEFAULTS as RestItem[]),
    test_key: new Repository<TestKeyData>("test_key", { count: 0 }),
    calFilters: new Repository<import('../domain/models').AppFilter[]>("calFilters", []),
    calSort: new Repository<string>("calSort", "time"),
    timeFilters: new Repository<import('../domain/models').AppFilter[]>("timeFilters", []),
    timeSort: new Repository<string>("timeSort", "time"),
    calendars: new Repository<CalendarData[]>("calendars", [{ id: "primary", summary: "Primary", active: true }])
} as const;

export const VALID_STORE_KEYS = [
    "settings", "tasks", "events", "distractions", "distractionStatuses", "distractionColumns",
    "stopwatch", "time_logs", "tips", "notes", "taskQuery", "taskFilters", "taskSort",
    "restItems", "test_key", "calFilters", "calSort", "timeFilters", "timeSort", "calendars"
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
