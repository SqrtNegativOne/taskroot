import type { AppEvent, AppTask } from "./models";
import { modernizeColor } from "../utils/colors";

// The populated output type for the UI
export type HydratedEvent = AppEvent & {
    title: string;
    task?: AppTask;
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
export function isEventAllDay(event: { startTime: string; endTime: string }): boolean {
    const YMD_LENGTH = 10;
    return event.startTime.length === YMD_LENGTH && event.endTime.length === YMD_LENGTH && !event.startTime.includes('T');
}

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
                task,
                color,
                category: cal?.summary ?? ev.category,
            };
        } else {
            return {
                ...ev,
                title: ev.title || "",
                color,
                category: cal?.summary ?? ev.category,
            };
        }
    });
}
