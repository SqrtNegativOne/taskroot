import { SyncType, SyncAction } from "./types";
import type { SyncQueueItem } from "./types";
import type { AppEvent } from "../../domain/models";

function getTargetCalendarId(
    currentEvent: AppEvent,
    oldEvent: AppEvent,
    calendars: { id: string; summary: string }[]
): string {
    if (currentEvent.category) {
        const cal = calendars.find((c) => c.summary === currentEvent.category);
        if (cal) return cal.id;
    }
    return oldEvent.googleCalendarId || "primary";
}

function handleCreation(currentEvent: AppEvent, actions: SyncQueueItem[]) {
    const isValid = !currentEvent.googleId && !currentEvent.isDraft && currentEvent.title && currentEvent.title.trim() !== "";
    if (isValid)
        actions.push({ type: SyncType.Event, action: SyncAction.Create, item: currentEvent });
}

function handleUpdateOrMove(
    currentEvent: AppEvent,
    oldEvent: AppEvent,
    actions: SyncQueueItem[],
    calendars: { id: string; summary: string }[]
) {
    if (!(currentEvent.updatedAt && oldEvent.updatedAt && currentEvent.updatedAt > oldEvent.updatedAt))
        return;

    const targetCalendarId = getTargetCalendarId(currentEvent, oldEvent, calendars);
    const isCalendarChange = oldEvent.googleCalendarId && oldEvent.googleCalendarId !== targetCalendarId;
    const hasValidTitle = currentEvent.title && currentEvent.title.trim() !== "";

    if (isCalendarChange && oldEvent.googleId) {
        actions.push({
            type: SyncType.Event,
            action: SyncAction.Move,
            item: currentEvent,
            googleId: oldEvent.googleId,
            calendarId: oldEvent.googleCalendarId,
            destinationCalendarId: targetCalendarId,
        });

        if (hasValidTitle) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: currentEvent,
                googleId: oldEvent.googleId,
                calendarId: targetCalendarId,
            });
        }
        return;
    }

    if (hasValidTitle) {
        actions.push({
            type: SyncType.Event,
            action: SyncAction.Update,
            item: currentEvent,
            googleId: currentEvent.googleId,
            calendarId: targetCalendarId,
        });
    }
}

function processSingleEventDelta(
    currentEvent: AppEvent,
    oldEvent: AppEvent | undefined,
    actions: SyncQueueItem[],
    calendars: { id: string; summary: string }[]
) {
    if (currentEvent.type === "log") return;

    if (!oldEvent) {
        handleCreation(currentEvent, actions);
    } else {
        handleUpdateOrMove(currentEvent, oldEvent, actions, calendars);
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
