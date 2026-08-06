export type YmdString = string; // Format: YYYY-MM-DD

export function isYmdString(s: unknown): s is YmdString {
    return typeof s === "string";
}

export interface AppTask {
    readonly id: string;
    readonly title: string;
    readonly status?: "todo" | "next-up" | "doing" | "done" | string;
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
    readonly googleId?: string;
    readonly notes?: string;
    readonly due?: YmdString;
    readonly _deleted?: boolean;
    readonly updatedAt?: number;
    readonly etag?: string;
    readonly [key: string]: unknown;
}

export interface AppFilter {
    id?: string;
    column: string;
    operator: string;
    value: string | number | (string | number)[];
}

export interface AppEvent {
    // --- Identity ---
    id: string;
    /** Stable Google Calendar event ID; absent until first sync. */
    googleId?: string;
    /** Which Google Calendar this belongs to (e.g. `"primary"` or a calendar ID). */
    googleCalendarId?: string;
    /** Links this event to an AppTask, turning it into a time-block for that task. */
    taskId?: string;

    // --- Content ---
    title: string;
    description?: string;

    // --- Timing ---
    /** Floating local datetime `"YYYY-MM-DDThh:mm:ss"`, or date-only `"YYYY-MM-DD"` for all-day events. */
    startTime: string;
    /** Same format as startTime. All-day is detected when both fields are 10-char date-only strings. */
    endTime: string;
    type: 'busy' | 'info' | 'log';

    // --- Recurrence (base event) ---
    /** RFC 5545 RRULE string defining the recurrence pattern. Only present on master events. */
    rrule?: string;
    /** Slots to skip from the recurrence, stored in compact `YYYYMMDDTHHMMSS` format. */
    exdates?: string[];

    // --- Recurrence (stored exception) ---
    /**
     * Local `id` of the master event this exception overrides.
     * Translated to the master's `googleId` when pushing to GCal.
     */
    recurringEventId?: string;
    /**
     * The generated slot start-time this exception replaces (`"YYYY-MM-DDThh:mm:ss"`).
     * Used by the expander to match and suppress the original instance.
     */
    originalStartTime?: string;
    /** True when the exception was cancelled (deleted) rather than rescheduled. */
    cancelled?: boolean;

    // --- Sync metadata ---
    /** Unix timestamp (ms) of last local write; drives push decisions in the sync engine. */
    updatedAt?: number;
    /** Soft-delete flag; kept until the deletion is confirmed pushed to GCal. */
    _deleted?: boolean;
    /** ETag fingerprint from Google API for optimistic concurrency control. */
    etag?: string;

    [key: string]: unknown;
}

export function toEventType(raw: string | undefined, fallback: AppEvent['type']): AppEvent['type'] {
    return (raw === "info" || raw === "busy" || raw === "log") ? raw : fallback;
}
