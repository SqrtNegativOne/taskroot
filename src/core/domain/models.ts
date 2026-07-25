export type DateString = string; // Format: YYYY-MM-DD

export function isDateString(s: unknown): s is DateString {
    return typeof s === "string";
}

export interface AppTask {
    id: string;
    title: string;
    status?: "todo" | "next-up" | "doing" | "done" | string;
    priority?: number | string;
    tags?: string[];
    subtasks?: { done: boolean; [key: string]: unknown }[];
    parent_task?: string | null;
    dependencies?: string[];
    est?: number;
    added?: string;
    isDraft?: boolean;
    canvasX?: number;
    canvasY?: number;
    onCanvas?: boolean;
    googleTaskId?: string;
    notes?: string;
    due?: DateString;
    _deleted?: boolean;
    updatedAt?: number;
    [key: string]: unknown;
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
    taskId?: string | null;
    title: string;
    date: DateString;
    start: number;
    end: number;
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
