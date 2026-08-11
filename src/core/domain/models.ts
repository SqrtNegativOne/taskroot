export type YmdString = string; // Format: YYYY-MM-DD

export function isYmdString(s: unknown): s is YmdString {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isAppTaskStatus(s: unknown): s is AppTask["status"] {
    return typeof s === "string" && ["todo", "next-up", "doing", "done"].includes(s);
}

export interface AppTask {
    readonly id: string;
    readonly title: string;
    readonly status?: "todo" | "next-up" | "doing" | "done" | undefined;
    readonly priority?: number | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly subtasks?: readonly { readonly done: boolean; readonly [key: string]: unknown }[] | undefined;
    readonly parent_task?: string | undefined;
    readonly dependencies?: readonly string[] | undefined;
    readonly est?: number | undefined;
    readonly added?: string | undefined;
    readonly canvasX?: number | undefined;
    readonly canvasY?: number | undefined;
    readonly onCanvas?: boolean | undefined;
    readonly remoteId?: string | undefined;
    readonly notes?: string | undefined;
    readonly tabs?: string | undefined;
    readonly due?: YmdString | undefined;
    readonly _deleted?: boolean | undefined;
    readonly updatedAt?: number | undefined;
    /** ETag fingerprint from Google API for optimistic concurrency control. */
    readonly etag?: string | undefined;
    readonly [key: string]: unknown;
}

/** Resolves to the union of keys whose type includes `undefined` (i.e. optional fields). */
export type OptionalKeysOf<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Returns a fluent builder for producing an updated copy of `item`.
 * Use `.set(key, value)` to update a field and `.clear(key)` to remove an
 * optional field (key deleted from the object entirely — not set to `undefined`).
 * Call `.done()` to retrieve the final value.
 *
 * Works for any object with a string `id`. Generic — no AppTask-specific logic here.
 */
export function editing<T extends { readonly id: string }>(item: T): {
    set<K extends keyof T>(key: K, value: T[K]): ReturnType<typeof editing<T>>;
    clear(key: OptionalKeysOf<T>): ReturnType<typeof editing<T>>;
    done(): T;
} {
    return {
        set<K extends keyof T>(key: K, value: T[K]) {
            return editing<T>({ ...item, [key]: value });
        },
        clear(key: OptionalKeysOf<T>) {
            const { [key]: _dropped, ...rest } = item;
            // Safe: key is constrained to OptionalKeysOf<T>, meaning the cleared key
            // is already optional in T. The remaining spread therefore still satisfies T.
            // oxlint-disable-next-line consistent-type-assertions, no-unsafe-type-assertion
            return editing<T>(rest as T);
        },
        done: () => item,
    };
}

export interface AppFilter {
    readonly id?: string;
    readonly column: string;
    readonly operator: string;
    readonly value: string | number | readonly (string | number)[];
}

export interface AppEvent {
    // --- Identity ---
    readonly id: string;
    /** Stable Google Calendar event ID; absent until first sync. */
    readonly remoteId?: string | undefined;
    /** Which Google Calendar this belongs to (e.g. `"primary"` or a calendar ID). */
    readonly remoteCollectionId?: string | undefined;
    /** Links this event to an AppTask, turning it into a time-block for that task. */
    readonly taskId?: string | undefined;

    // --- Content ---
    readonly title: string;
    readonly description?: string | undefined;

    // --- Timing ---
    /** Floating local datetime `"YYYY-MM-DDThh:mm:ss"`, or date-only `"YYYY-MM-DD"` for all-day events. */
    readonly startTime: string;
    /** Same format as startTime. All-day is detected when both fields are 10-char date-only strings. */
    readonly endTime: string;
    readonly type: 'busy' | 'info' | 'log';

    // --- Recurrence (base event) ---
    /** RFC 5545 RRULE string defining the recurrence pattern. Only present on master events. */
    readonly rrule?: string | undefined;
    /** Slots to skip from the recurrence, stored in compact `YYYYMMDDTHHMMSS` format. */
    readonly exdates?: readonly string[] | undefined;

    // --- Recurrence (stored exception) ---
    /**
     * Local `id` of the master event this exception overrides.
     * Translated to the master's `remoteId` when pushing to GCal.
     */
    readonly recurringEventId?: string | undefined;
    /**
     * The generated slot start-time this exception replaces (`"YYYY-MM-DDThh:mm:ss"`).
     * Used by the expander to match and suppress the original instance.
     */
    readonly originalStartTime?: string | undefined;
    /** True when the exception was cancelled (deleted) rather than rescheduled. */
    readonly cancelled?: boolean | undefined;

    // --- Sync metadata ---
    /** Unix timestamp (ms) of last local write; drives push decisions in the sync engine. */
    readonly updatedAt?: number | undefined;
    /** Soft-delete flag; kept until the deletion is confirmed pushed to GCal. */
    readonly _deleted?: boolean | undefined;
    /** ETag fingerprint from Google API for optimistic concurrency control. */
    readonly etag?: string | undefined;

    readonly [key: string]: unknown;
}

export function toEventType(raw: string | undefined, fallback: AppEvent['type']): AppEvent['type'] {
    return (raw === "info" || raw === "busy" || raw === "log") ? raw : fallback;
}

export interface AppNote {
    readonly id: string;
    readonly title: string;
    readonly vault: string;
    readonly path: string;
}
