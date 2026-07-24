import React, {
    useState,
    useEffect,
    useSyncExternalStore,
    useCallback,
} from "react";

import { storeRegistry } from "./storeRegistry";
import { taskSync, eventSync, pusher } from "../sync";
import {
    SAMPLE_TASKS,
    SAMPLE_EVENTS,
    DEFAULT_STATUSES,
    DEFAULT_DISTRACTION_COLUMNS,
    SAMPLE_DISTRACTIONS,
    SAMPLE_TIPS,
    SAMPLE_NOTES,
} from "./data";
import { SETTINGS_SCHEMA, DEFAULT_SETTINGS } from "./settingsSchema";
import type { AppSettings } from "./settingsSchema";
import type { AppTask, AppEvent } from "../domain/models";

const VALID_STORE_KEYS = [
    "settings",
    "tasks",
    "events",
    "distractions",
    "distractionStatuses",
    "distractionColumns",
    "stopwatch",
    "time_logs",
    "tips",
    "notes",
    "taskQuery",
    "taskFilters",
    "taskSort",
    "restItems",
    "test_key",
    "calFilters",
    "calSort",
    "timeFilters",
    "timeSort",
    "calendars",
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
    if (keysToRemove.length > 0) {
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        if (notify) {
            notify(
                `Removed ${keysToRemove.length} orphaned store item(s).`,
                "error",
            );
        }
    }
}

// React hook: manages local state, localStorage, and delegates remote sync to the ApiService
export function useStored<T>(
    key: StoreKey,
    initial: T,
    parser?: (saved: unknown) => T,
    interceptor?: (result: T, prev?: T) => T,
    onDelta?: (result: T) => void
): [T, (val: T | ((prev: T) => T)) => void, boolean] {
    const [val, setVal] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(`taskroot_${key}`);
            const parsed = saved ? JSON.parse(saved) : initial;
            if (parser) {
                return parser(parsed);
            }
            return parsed;
        } catch (e) {
            if (parser) return parser(initial);
            return initial;
        }
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Register the setter with Sync modules so they can push updates from the cloud to React
        return storeRegistry.registerUpdater(key, (serverVal: T) => {
            setVal(serverVal);
        });
    }, [key]);

    useEffect(() => {
        // Notify Sync modules that this store is ready to receive data
        const unregister = storeRegistry.registerUpdater(key, (serverVal: T) => {
            setVal(serverVal);
            localStorage.setItem(`taskroot_${key}`, JSON.stringify(serverVal));
        });

        // Optimistically set loaded
        setIsLoaded(true);

        return () => {
            unregister();
        };
    }, [key]);

    const setValWrapper = (newValOrUpdater: T | ((prev: T) => T)) => {
        let result: T;
        if (typeof newValOrUpdater === "function") {
            setVal((prev: T) => {
                // We must use 'as' here because typeof cannot distinguish between T being a function and newValOrUpdater being an updater function.
                const updater = newValOrUpdater as (prev: T) => T;
                result = updater(prev);

                if (interceptor) {
                    result = interceptor(result, prev);
                }

                localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));

                if (onDelta) {
                    onDelta(result);
                }

                return result;
            });
        } else {
            result = newValOrUpdater;

            if (interceptor) {
                result = interceptor(result, undefined);
            }

            setVal(result); // Optimistic update
            localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));

            if (onDelta) {
                onDelta(result);
            }
        }
    };

    return [val, setValWrapper, isLoaded];
}

export function useSettingsStore(initial: AppSettings): [AppSettings, (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void, boolean] {
    return useStored<AppSettings>(
        "settings",
        initial,
        (parsed: any) => {
            const result: AppSettings = { ...DEFAULT_SETTINGS };
            if (parsed && typeof parsed === "object") {
                for (const s of SETTINGS_SCHEMA) {
                    if (!(s.id in parsed)) continue;

                    let val = parsed[s.id];
                    if (s.type === "number") {
                        val = Number(val);
                        if (s.min !== undefined && val < s.min) val = s.min;
                        if (s.max !== undefined && val > s.max) val = s.max;
                    } else if (s.type === "checkbox") {
                        val = Boolean(val);
                    }
                    Object.assign(result, { [s.id]: val });
                }
            }
            return result;
        }
    );
}

function injectUpdatedAt<T extends { id?: string; updatedAt?: number }>(result: T[], prev?: T[]): T[] {
    if (Array.isArray(result)) {
        let mutated = false;
        const mapped = result.map((newItem) => {
            if (newItem && newItem.id) {
                if (!prev) {
                    if (!newItem.updatedAt) {
                        mutated = true;
                        return { ...newItem, updatedAt: Date.now() } as unknown as T;
                    }
                    return newItem;
                }
                const oldItem = prev.find((o) => o.id === newItem.id);
                const { updatedAt: _o, ...oldRest } = oldItem || {};
                const { updatedAt: _n, ...newRest } = newItem;
                if (!oldItem || JSON.stringify(oldRest) !== JSON.stringify(newRest)) {
                    mutated = true;
                    return { ...newItem, updatedAt: Date.now() } as unknown as T;
                }
            }
            return newItem;
        });
        if (mutated) return mapped;
    }
    return result;
}

export function useTasksStore(initial: AppTask[]): [AppTask[], (val: AppTask[] | ((prev: AppTask[]) => AppTask[])) => void, boolean] {
    return useStored<AppTask[]>(
        "tasks",
        initial,
        undefined,
        injectUpdatedAt,
        (result) => {
            taskSync.computeTasksDelta(result);
            pusher.trigger();
        }
    );
}

export function useEventsStore(initial: AppEvent[]): [AppEvent[], (val: AppEvent[] | ((prev: AppEvent[]) => AppEvent[])) => void, boolean] {
    return useStored<AppEvent[]>(
        "events",
        initial,
        undefined,
        injectUpdatedAt,
        (result) => {
            eventSync.computeEventsDelta(result);
            pusher.trigger();
        }
    );
}

// These are largely no-ops now since useStored handles everything
export function load(key: string, fallback: unknown) {
    return fallback;
}
export function seedDefaults() {}
