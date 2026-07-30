export type DateString = string; // Format: YYYY-MM-DD

export function isDateString(s: unknown): s is DateString {
    return typeof s === "string";
}

export interface AppTask {
    readonly id: string;
    readonly title: string;
    readonly status?: "todo" | "next-up" | "doing" | "done" | string;
    readonly priority?: number | string;
    readonly tags?: readonly string[];
    readonly subtasks?: readonly { readonly done: boolean; readonly [key: string]: unknown }[];
    readonly parent_task?: string;
    readonly dependencies?: readonly string[];
    readonly est?: number;
    readonly added?: string;
    readonly isDraft?: boolean;
    readonly canvasX?: number;
    readonly canvasY?: number;
    readonly onCanvas?: boolean;
    readonly googleTaskId?: string;
    readonly notes?: string;
    readonly due?: DateString;
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
    googleEventId?: string;
    googleCalendarId?: string;
    taskId?: string;
    title: string;
    date: DateString;
    start: number;
    end: number;
    isAllDay?: boolean;
    type: string;
    category?: string;
    rrule?: string;
    description?: string;
    updatedAt?: number;
    _deleted?: boolean;
    isInstance?: boolean;
    baseEventId?: string;
    endDate?: DateString;
    [key: string]: unknown;
}
