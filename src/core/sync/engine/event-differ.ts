import { SyncType, SyncAction } from "./types";
import type { SyncQueueItem } from "./types";
import type { AppEvent } from "../../domain/models";

function processSingleEventDelta(
    currentEvent: AppEvent,
    oldEvent: AppEvent | undefined,
    actions: SyncQueueItem[],
    calendars: { id: string; summary: string }[]
) {
    if (currentEvent.type === "log") return;

    if (!oldEvent) {
        if (!currentEvent.googleId && !currentEvent.isDraft && currentEvent.title && currentEvent.title.trim() !== "") {
            actions.push({ type: SyncType.Event, action: SyncAction.Create, item: currentEvent });
        }
        return;
    }

    if (!(currentEvent.updatedAt && oldEvent.updatedAt && currentEvent.updatedAt > oldEvent.updatedAt))
        return;

    let targetCalendarId = oldEvent.googleCalendarId || "primary";
    if (currentEvent.category) {
        const cal = calendars.find((c) => c.summary === currentEvent.category);
        if (cal) targetCalendarId = cal.id;
    }

    if (oldEvent.googleCalendarId && oldEvent.googleCalendarId !== targetCalendarId) {
        if (oldEvent.googleId) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: oldEvent,
                googleId: oldEvent.googleId,
                calendarId: oldEvent.googleCalendarId,
            });
        }
        if (currentEvent.title && currentEvent.title.trim() !== "") {
            actions.push({ type: SyncType.Event, action: SyncAction.Create, item: currentEvent });
        }
    } else {
        if (currentEvent.title && currentEvent.title.trim() !== "") {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: currentEvent,
                googleId: currentEvent.googleId,
                calendarId: targetCalendarId,
            });
        }
    }
}

export function computeEventDeltaActions(
    currentEvents: AppEvent[],
    oldEventsMap: Map<string, AppEvent>,
    calendars: { id: string; summary: string }[]
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const currentEventsMap = new Map(currentEvents.map((e) => [e.id, e]));

    for (const event of currentEvents)
        processSingleEventDelta(event, oldEventsMap.get(event.id), actions, calendars);

    for (const [id, oldEvent] of oldEventsMap.entries()) {
        if (oldEvent.type === "log") continue;
        if (!currentEventsMap.has(id)) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: oldEvent,
                googleId: oldEvent.googleId,
                calendarId: oldEvent.googleCalendarId || "primary",
            });
        }
    }

    return actions;
}
