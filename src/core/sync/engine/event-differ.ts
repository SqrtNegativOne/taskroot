import { SyncType, SyncAction } from "./types";
import type { SyncQueueItem } from "./types";
import type { AppEvent } from "../../domain/models";

function processSingleEventDelta(
    event: AppEvent,
    prev: AppEvent | undefined,
    actions: SyncQueueItem[],
    calendars: { id: string; summary: string }[]
) {
    if (event.type === "log") return;

    if (!prev) {
        if (!event.googleId && !event.isDraft && event.title && event.title.trim() !== "") {
            actions.push({ type: SyncType.Event, action: SyncAction.Create, item: event });
        }
        return;
    }

    if (!(event.updatedAt && prev.updatedAt && event.updatedAt > prev.updatedAt)) {
        return;
    }

    let targetCalendarId = prev.googleCalendarId || "primary";
    if (event.category) {
        const cal = calendars.find((c) => c.summary === event.category);
        if (cal) targetCalendarId = cal.id;
    }

    if (prev.googleCalendarId && prev.googleCalendarId !== targetCalendarId) {
        if (prev.googleId) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: prev,
                googleId: prev.googleId,
                calendarId: prev.googleCalendarId,
            });
        }
        if (event.title && event.title.trim() !== "") {
            actions.push({ type: SyncType.Event, action: SyncAction.Create, item: event });
        }
    } else {
        if (event.title && event.title.trim() !== "") {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: event,
                googleId: event.googleId,
                calendarId: targetCalendarId,
            });
        }
    }
}

export function computeEventDeltaActions(
    newEvents: AppEvent[],
    prevEventsMap: Map<string, AppEvent>,
    calendars: { id: string; summary: string }[]
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const newEventsMap = new Map(newEvents.map((e) => [e.id, e]));

    for (const event of newEvents) {
        processSingleEventDelta(event, prevEventsMap.get(event.id), actions, calendars);
    }

    for (const [id, prev] of prevEventsMap.entries()) {
        if (prev.type === "log") continue;
        if (!newEventsMap.has(id)) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: prev,
                googleId: prev.googleId,
                calendarId: prev.googleCalendarId || "primary",
            });
        }
    }

    return actions;
}
