import type { AppEvent, AppTask } from "./models";
import { modernizeColor } from "../utils/colors";

type BaseEvent = {
    id: string;
    title?: string;
    startTime: string; // ISO string
    endTime: string;
    isAllDay?: boolean;
    rrule?: string;
    recurringEventId?: string;
    originalStartTime?: string;
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

function resolveEventCalendar(
    ev: AppEvent,
    calendars: { id: string; summary: string; backgroundColor?: string; foregroundColor?: string; primary?: boolean }[]
) {
    let calId = ev.googleCalendarId;
    if (calId === "primary") {
        const primaryCal = calendars.find((c) => c.primary);
        if (primaryCal) calId = primaryCal.id;
    }
    let cal = calId
        ? calendars.find((c) => c.id === calId)
        : ev.category
        ? calendars.find((c) => c.summary === ev.category)
        : undefined;
    if (!cal) {
        cal = calendars.find((c) => c.primary) || calendars[0];
    }
    return cal;
}

/**
 * Hydrates events with data from their respective tasks to ensure consistency.
 */
export function hydrateEvents(
    events: AppEvent[],
    tasks: AppTask[],
    calendars: { id: string; summary: string; backgroundColor?: string; foregroundColor?: string; primary?: boolean }[] = [],
): HydratedEvent[] {
    return events.map((ev) => {
        const cal = resolveEventCalendar(ev, calendars);
        const color = cal?.backgroundColor ? modernizeColor(cal.backgroundColor) : undefined;
        if (ev.taskId) {
            const task = tasks.find((t) => t.id === ev.taskId);
            return {
                ...ev,
                title: task ? task.title : "Unknown Task",
                priority: task ? task.priority : undefined,
                isDone: task ? task.status === "done" : false,
                task,
                color,
                category: cal?.summary ?? ev.category,
            };
        } else {
            // Info, Busy, Log, etc.
            return {
                ...ev,
                title: ev.title || "",
                isDone: false,
                color,
                category: cal?.summary ?? ev.category,
            };
        }
    });
}
