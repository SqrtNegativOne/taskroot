import { storeRegistry } from "./storeRegistry";

import { taskSync, eventSync, pusher } from "../sync";
import { SETTINGS_SCHEMA, DEFAULT_SETTINGS } from "./settingsSchema";
import type { AppSettings } from "./settingsSchema";
import type { AppTask, AppEvent } from "../domain/models";
import type { AppNote } from "../../screens/do/tips-notes";
import { DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, REST_CHECKLIST_DEFAULTS } from "./data";

export interface DistractionRow { readonly id: string; readonly [key: string]: unknown; }
export interface DistractionStatus { readonly id: string; readonly label: string; readonly color: string; }
export interface DistractionColumn { readonly id: string; readonly label: string; readonly width: number; readonly type: string; }
export interface StopwatchState { readonly elapsed: number; readonly runningSince?: number | undefined; readonly isBreak: boolean; readonly breakAllowedMs: number; readonly breakStartedAt?: number | undefined; readonly breakSoundPlayed: boolean; }
export type TimeLog = AppEvent;
export interface RestItem { readonly id: string; readonly title: string; readonly type: string; readonly checked?: boolean; }
export interface CalendarData { readonly id: string; readonly summary: string; readonly active: boolean; readonly accessRole?: string; readonly backgroundColor?: string; readonly foregroundColor?: string; readonly primary?: boolean; }
export interface TestKeyData { readonly count: number; }

import { Result, ok } from "neverthrow";
import { QuotaExceededError, SerializationError, DataCorruptionError } from "./errors";

const isUpdater = <T>(v: T | ((prev: T) => T)): v is ((prev: T) => T) => typeof v === "function";

export class Repository<T> {
    public key: string;
    public initial: T;
    private parser?: ((saved: unknown) => T) | undefined;
    private interceptor?: ((next: T, prev?: T) => T) | undefined;
    private onDelta?: ((result: T, prev: T) => void) | undefined;

    constructor(
        key: string,
        initial: T,
        options?: {
            parser?: ((saved: unknown) => T) | undefined;
            interceptor?: ((next: T, prev?: T) => T) | undefined;
            onDelta?: ((result: T, prev: T) => void) | undefined;
        }
    ) {
        this.key = key;
        this.initial = initial;
        this.parser = options?.parser;
        this.interceptor = options?.interceptor;
        this.onDelta = options?.onDelta;
    }

    get(): Result<T, DataCorruptionError> {
        return storeRegistry.getLocalData(this.key).andThen((data) => {
            const raw = (data === null || data === undefined) ? this.initial : data;
            // T is erased at runtime. Without a parser provided, we have no runtime way
            // to validate if the parsed JSON matches T. We must blindly trust the data here.
            // oxlint-disable-next-line consistent-type-assertions, no-unsafe-type-assertion
            if (!this.parser) return ok(raw as T);
            
            const safeParser = Result.fromThrowable(
                this.parser,
                (e) => new DataCorruptionError(e instanceof Error ? e.message : String(e))
            );
            return safeParser(raw);
        });
    }

    set(newValOrUpdater: T | ((prev: T) => T)): Result<T, SerializationError | QuotaExceededError | Error> {
        const prevRes = this.get();
        // If there's corruption, fallback to initial for the update calculation
        const prev = prevRes.isOk() ? prevRes.value : this.initial;
        
        const next = isUpdater(newValOrUpdater) ? newValOrUpdater(prev) : newValOrUpdater;
        const mutated = this.interceptor ? this.interceptor(next, prev) : next;
        
        return storeRegistry.setLocalData(this.key, mutated).map(() => {
            if (this.onDelta) {
                this.onDelta(mutated, prev);
            }
            return mutated;
        });
    }
}

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
    taskSync.computeDelta(result);
    pusher.trigger();
}

function onEventsDelta(result: AppEvent[], _prev: AppEvent[]) {
    eventSync.computeDelta(result);
    pusher.trigger();
}

function parseEvents(parsed: unknown): AppEvent[] {
    if (!Array.isArray(parsed)) return [];
    
    const events: AppEvent[] = parsed.filter((ev): ev is AppEvent => isRecord(ev));
    
    return events;
}

export const repos = {
    settings: new Repository<AppSettings>("settings", DEFAULT_SETTINGS, { parser: parseSettings }),
    tasks: new Repository<AppTask[]>("tasks", [], { interceptor: (next, prev) => injectUpdatedAt<AppTask>(next, prev), onDelta: onTasksDelta }),
    events: new Repository<AppEvent[]>("events", [], { parser: parseEvents, interceptor: (next, prev) => injectUpdatedAt<AppEvent>(next, prev), onDelta: onEventsDelta }),
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
