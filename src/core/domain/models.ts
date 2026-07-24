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
    due?: string;
    _deleted?: boolean;
    updatedAt?: number;
    [key: string]: unknown;
}

export interface AppFilter {
    id?: string;
    column: string;
    operator: string;
    value: string | number;
}

export interface AppEvent {
    id: string;
    googleEventId?: string;
    googleCalendarId?: string;
    taskId?: string | null;
    title: string;
    date: string;
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
    endDate?: string | Date;
    [key: string]: unknown;
}
