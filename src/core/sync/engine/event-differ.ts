import { SyncType, SyncAction } from "./types";
import type { SyncQueueItem } from "./types";
import type { AppEvent } from "../../domain/models";

function getTargetCalendarId(currentEvent: AppEvent, oldEvent: AppEvent): string {
    return currentEvent.remoteCollectionId || oldEvent.remoteCollectionId || "primary";
}

function handleCreation(currentEvent: AppEvent, actions: SyncQueueItem[]) {
    const isValid = !currentEvent.remoteId && currentEvent.title && currentEvent.title.trim() !== "";
    if (isValid)
        actions.push({ type: SyncType.Event, action: SyncAction.Create, item: currentEvent });
}

function getUpdatedFields(currentEvent: AppEvent, oldEvent: AppEvent): (keyof AppEvent)[] {
    const updatedFields: (keyof AppEvent)[] = [];
    for (const k of Object.keys(currentEvent) as (keyof AppEvent)[]) {
        const isIgnored = k === "updatedAt" || k === "etag";
        if (isIgnored) continue;
        
        const isChanged = JSON.stringify(currentEvent[k]) !== JSON.stringify(oldEvent[k]);
        if (isChanged) {
            updatedFields.push(k);
        }
    }
    return updatedFields;
}

function handleUpdateOrMove(
    currentEvent: AppEvent,
    oldEvent: AppEvent,
    actions: SyncQueueItem[]
) {
    const isNewer = currentEvent.updatedAt && oldEvent.updatedAt && currentEvent.updatedAt > oldEvent.updatedAt;
    if (!isNewer) return;

    const targetCalendarId = getTargetCalendarId(currentEvent, oldEvent);
    const isCalendarChange = oldEvent.remoteCollectionId && oldEvent.remoteCollectionId !== targetCalendarId;
    const hasValidTitle = currentEvent.title && currentEvent.title.trim() !== "";

    const updatedFields = getUpdatedFields(currentEvent, oldEvent);

    if (isCalendarChange && oldEvent.remoteId) {
        actions.push({
            type: SyncType.Event,
            action: SyncAction.Move,
            item: currentEvent,
            remoteId: oldEvent.remoteId,
            calendarId: oldEvent.remoteCollectionId,
            destinationCalendarId: targetCalendarId,
            updatedFields
        });

        if (hasValidTitle) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: currentEvent,
                remoteId: oldEvent.remoteId,
                calendarId: targetCalendarId,
                updatedFields
            });
        }
        return;
    }

    if (hasValidTitle) {
        const hasRemoteId = currentEvent.remoteId !== undefined;
        actions.push({
            type: SyncType.Event,
            action: SyncAction.Update,
            item: currentEvent,
            ...(hasRemoteId ? { remoteId: currentEvent.remoteId } : {}),
            calendarId: targetCalendarId,
            updatedFields
        });
    }
}

function processSingleEventDelta(
    currentEvent: AppEvent,
    oldEvent: AppEvent | undefined,
    actions: SyncQueueItem[]
) {
    if (currentEvent.type === "log") return;

    if (!oldEvent) {
        handleCreation(currentEvent, actions);
    } else {
        handleUpdateOrMove(currentEvent, oldEvent, actions);
    }
}

export function computeEventDeltaActions(
    currentEvents: AppEvent[],
    oldEventsMap: Map<string, AppEvent>
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const currentEventsMap = new Map(currentEvents.map((e) => [e.id, e]));

    for (const event of currentEvents)
        processSingleEventDelta(event, oldEventsMap.get(event.id), actions);

    for (const [id, oldEvent] of oldEventsMap.entries()) {
        if (oldEvent.type === "log") continue;
        if (!currentEventsMap.has(id)) {
            actions.push({
                type: SyncType.Event,
                action: SyncAction.Delete,
                item: oldEvent,
                ...(oldEvent.remoteId !== undefined ? { remoteId: oldEvent.remoteId } : {}),
                calendarId: oldEvent.remoteCollectionId || "primary",
            });
        }
    }

    return actions;
}
