import type { AppEvent, AppTask } from "./models";
import { modernizeColor } from "../utils/colors";

export type HydratedEvent = AppEvent & {
    task?: AppTask;
    color?: string;
    /** The display name of the calendar this event belongs to. Computed at hydration time from
     *  googleCalendarId; never stored on the event itself. */
    category?: string;
    /** Set by the expander; true when this is a virtual instance generated from an rrule (never stored). */
    isInstance?: boolean;
    /** Set by the expander; the local `id` of the master event this instance was generated from. */
    baseEventId?: string;
};

type Calendar = { id: string; summary: string; backgroundColor?: string; foregroundColor?: string; primary?: boolean };

function resolveEventCalendar(ev: AppEvent, calendars: Calendar[]): Calendar | undefined {
    const calId = ev.googleCalendarId === "primary"
        ? (calendars.find((c) => c.primary)?.id ?? "primary")
        : ev.googleCalendarId;

    return calId
        ? (calendars.find((c) => c.id === calId) ?? calendars.find((c) => c.primary) ?? calendars[0])
        : (calendars.find((c) => c.primary) ?? calendars[0]);
}

export function isEventAllDay(event: { startTime: string; endTime: string }): boolean {
    const YMD_LENGTH = 10;
    return event.startTime.length === YMD_LENGTH && event.endTime.length === YMD_LENGTH && !event.startTime.includes('T');
}

export function hydrateEvents(
    events: AppEvent[],
    tasks: AppTask[],
    calendars: Calendar[] = [],
): HydratedEvent[] {
    return events.map((ev) => {
        const cal = resolveEventCalendar(ev, calendars);
        const color = cal?.backgroundColor ? modernizeColor(cal.backgroundColor) : undefined;
        const category = cal?.summary;
        if (ev.taskId) {
            const task = tasks.find((t) => t.id === ev.taskId);
            return { ...ev, title: task ? task.title : "Unknown Task", task, color, category };
        }
        return { ...ev, title: ev.title || "", color, category };
    });
}
