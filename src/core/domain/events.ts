import type { AppEvent, AppTask } from "./models";
import { modernizeColor } from "../utils/colors";

type BaseEvent = {
    id: string;
    title?: string;
    date: import("./models").DateString; // YYYY-MM-DD
    start: number; // minutes from midnight
    end: number;
    endDate?: import("./models").DateString;
    isAllDay?: boolean;
    rrule?: string;
    recurringEventId?: string;
    originalStartDate?: string;
    cancelled?: boolean;
    isInstance?: boolean;
    baseEventId?: string;
};

// The populated output type for the UI
export type HydratedEvent = BaseEvent & {
    type: string;
    taskId?: string; // only if it's a plan
    title: string;
    category?: string;
    priority?: string | number;
    isDone: boolean;
    tags?: string[];
    task?: AppTask; // The raw task object if needed by the UI
    color?: string;
};

/**
 * Hydrates events with data from their respective tasks to ensure consistency.
 */
export function hydrateEvents(
    events: AppEvent[],
    tasks: AppTask[],
    calendars: { id: string; summary: string; backgroundColor?: string; foregroundColor?: string }[] = [],
): HydratedEvent[] {
    return events.map((ev) => {
        const cal = ev.googleCalendarId ? calendars.find(c => c.id === ev.googleCalendarId) : calendars.find(c => c.summary === ev.category);
        const color = cal?.backgroundColor ? modernizeColor(cal.backgroundColor) : undefined;
        if (ev.type === "plan") {
            const task = tasks.find((t) => t.id === ev.taskId);
            return {
                ...ev,
                title: task ? task.title : "Unknown Task",
                priority: task ? task.priority : undefined,
                isDone: task ? task.status === "done" : false,
                task,
                color,
            };
        } else {
            // Info, Busy, Log, etc.
            return {
                ...ev,
                title: ev.title || "Untitled",
                isDone: false,
                color,
            };
        }
    });
}
