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
    readonly status?: "todo" | "next-up" | "doing" | "done";
    readonly priority?: number;
    readonly tags?: readonly string[];
    readonly subtasks?: readonly { readonly done: boolean; readonly [key: string]: unknown }[];
    readonly parent_task?: string;
    readonly dependencies?: readonly string[];
    readonly est?: number;
    readonly added?: string;
    readonly canvasX?: number;
    readonly canvasY?: number;
    readonly onCanvas?: boolean;
    readonly remoteId?: string;
    readonly notes?: string;
    readonly tabs?: string;
    readonly due?: YmdString;
    readonly _deleted?: boolean;
    readonly updatedAt?: number;
    /** ETag fingerprint from Google API for optimistic concurrency control. */
    readonly etag?: string;
    readonly [key: string]: unknown;
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
    readonly remoteId?: string;
    /** Which Google Calendar this belongs to (e.g. `"primary"` or a calendar ID). */
    readonly remoteCollectionId?: string;
    /** Links this event to an AppTask, turning it into a time-block for that task. */
    readonly taskId?: string;

    // --- Content ---
    readonly title: string;
    readonly description?: string;

    // --- Timing ---
    /** Floating local datetime `"YYYY-MM-DDThh:mm:ss"`, or date-only `"YYYY-MM-DD"` for all-day events. */
    readonly startTime: string;
    /** Same format as startTime. All-day is detected when both fields are 10-char date-only strings. */
    readonly endTime: string;
    readonly type: 'busy' | 'info' | 'log';

    // --- Recurrence (base event) ---
    /** RFC 5545 RRULE string defining the recurrence pattern. Only present on master events. */
    readonly rrule?: string;
    /** Slots to skip from the recurrence, stored in compact `YYYYMMDDTHHMMSS` format. */
    readonly exdates?: readonly string[];

    // --- Recurrence (stored exception) ---
    /**
     * Local `id` of the master event this exception overrides.
     * Translated to the master's `remoteId` when pushing to GCal.
     */
    readonly recurringEventId?: string;
    /**
     * The generated slot start-time this exception replaces (`"YYYY-MM-DDThh:mm:ss"`).
     * Used by the expander to match and suppress the original instance.
     */
    readonly originalStartTime?: string;
    /** True when the exception was cancelled (deleted) rather than rescheduled. */
    readonly cancelled?: boolean;

    // --- Sync metadata ---
    /** Unix timestamp (ms) of last local write; drives push decisions in the sync engine. */
    readonly updatedAt?: number;
    /** Soft-delete flag; kept until the deletion is confirmed pushed to GCal. */
    readonly _deleted?: boolean;
    /** ETag fingerprint from Google API for optimistic concurrency control. */
    readonly etag?: string;

    readonly [key: string]: unknown;
}

export function toEventType(raw: string | undefined, fallback: AppEvent['type']): AppEvent['type'] {
    return (raw === "info" || raw === "busy" || raw === "log") ? raw : fallback;
}
