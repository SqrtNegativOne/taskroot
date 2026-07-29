import { SyncAction, SyncType, SyncQueueItem } from "./types";
import type { AppEvent } from "../../domain/models";

export function computeEventDeltaActions(
    newEvents: AppEvent[],
    prevEventsMap: Map<string, AppEvent>,
    calendars: { id: string; summary: string }[]
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const newEventsMap = new Map(newEvents.map((e) => [e.id, e]));

    for (const event of newEvents) {
        const prev = prevEventsMap.get(event.id);
        if (!prev) {
            if (!event.googleEventId) {
                actions.push({
                    type: SyncType.Event,
                    action: SyncAction.Create,
                    item: event,
                });
            }
            continue;
        }

        if (!(
            event.updatedAt &&
            prev.updatedAt &&
            event.updatedAt > prev.updatedAt
        )) {
            continue;
        }

        let targetCalendarId = prev.googleCalendarId || "primary";
        if (event.category) {
            const cal = calendars.find((c) => c.summary === event.category);
            if (cal) targetCalendarId = cal.id;
        }

        if (
            prev.googleCalendarId &&
            prev.googleCalendarId !== targetCalendarId
        ) {
            if (prev.googleEventId) {
                actions.push({
                    type: SyncType.Event,
                    action: SyncAction.Delete,
                    item: prev,
                    id: prev.googleEventId,
                    calendarId: prev.googleCalendarId,
                });
            }
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Create,
                item: event,
            });
        } else if (event.googleEventId) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: event,
                id: event.googleEventId,
                calendarId: targetCalendarId,
            });
        } else {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Create,
                item: event,
            });
        }
    }

    for (const [id, prev] of prevEventsMap.entries()) {
        if (!newEventsMap.has(id) && prev.googleEventId) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: prev,
                id: prev.googleEventId,
                calendarId: prev.googleCalendarId || "primary",
            });
        }
    }

    return actions;
}
