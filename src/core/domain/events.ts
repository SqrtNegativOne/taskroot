import type { AppTask } from "./models";

export type BaseEvent = {
    id: string;
    title?: string;
    date: string; // YYYY-MM-DD
    start: number; // minutes from midnight
    end: number;
    endDate?: string;
    isAllDay?: boolean;
    rrule?: string;
    recurringEventId?: string;
    originalStartDate?: string;
    cancelled?: boolean;
    isInstance?: boolean;
    baseEventId?: string;
};

// Task plans: when you schedule a task for a certain time.
export type TaskEvent = BaseEvent & {
    type: "plan";
    taskId: string;
};

// Informational: Deadlines, holidays, reminders. Can be full-day or time-bound.
export type InfoEvent = BaseEvent & {
    type: "info";
    title: string;
};

// Busy: Meetings, group projects. Can be time-bound only.
export type BusyEvent = BaseEvent & {
    type: "busy";
    title: string;
    isAllDay?: false;
};

// Log: What you actually did. (Unimplemented features for now)
export type LogEvent = Omit<BaseEvent, "isAllDay" | "endDate"> & {
    type: "log";
    title: string;
    isAllDay: false;
    endDate?: never;
};

export type AppEvent = TaskEvent | InfoEvent | BusyEvent | LogEvent;

// The populated output type for the UI
export type HydratedEvent = BaseEvent & {
    type: "plan" | "info" | "busy" | "log";
    taskId?: string; // only if it's a plan
    title: string;
    category?: string;
    priority?: string | number | null;
    isDone: boolean;
    tags?: string[];
    task?: AppTask; // The raw task object if needed by the UI
};

/**
 * Hydrates events with data from their respective tasks to ensure consistency.
 */
export function hydrateEvents(
    events: AppEvent[],
    tasks: AppTask[],
): HydratedEvent[] {
    return events.map((ev) => {
        if (ev.type === "plan") {
            const task = tasks.find((t) => t.id === ev.taskId);
            return {
                ...ev,
                title: task ? task.title : "Unknown Task",
                priority: task ? task.priority : null,
                isDone: task ? task.status === "done" : false,
                task,
            };
        } else {
            // Info, Busy, Log, etc.
            return {
                ...ev,
                title: ev.title || "Untitled",
                isDone: false,
            };
        }
    });
}
