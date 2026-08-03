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
    readonly [key: string]: unknown;
}

export interface AppFilter {
    id?: string;
    column: string;
    operator: string;
    value: string | number | (string | number)[];
}

export interface AppEvent {
    id: string;
    googleId?: string;
    googleCalendarId?: string;
    taskId?: string;
    title: string;
    startTime: string;
    endTime: string;
    type: 'busy' | 'info' | 'log';
    category?: string;
    rrule?: string;
    exdates?: string[];
    recurringEventId?: string;
    originalStartTime?: string;
    description?: string;
    updatedAt?: number;
    _deleted?: boolean;
    isInstance?: boolean;
    baseEventId?: string;

    [key: string]: unknown;
}

export function toEventType(raw: string | undefined, fallback: AppEvent['type']): AppEvent['type'] {
    return (raw === "info" || raw === "busy" || raw === "log") ? raw : fallback;
}
