import type { ISyncStrategy } from "./Synchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ICalendarAPI } from "../calendar-api/types";
import type { AppEvent } from "../../domain/models";
import { ResultAsync, okAsync } from "neverthrow";
import { resolveConflict } from "./conflict-resolver";
import { computeEventDeltaActions } from "./event-differ";
import { toSyncError, type SyncError } from "../errors";

export class EventSyncStrategy implements ISyncStrategy<AppEvent> {
    private context: ISyncEngineContext;
    private calendarAPI: ICalendarAPI;

    constructor(context: ISyncEngineContext, calendarAPI: ICalendarAPI) {
        this.context = context;
        this.calendarAPI = calendarAPI;
    }

    isSyncEnabled(): boolean {
        return this.context.getSettings().enableCalendarSync ?? true;
    }

    getLocalStoreKey(): string {
        return "events";
    }

    getSyncType(): SyncType {
        return SyncType.Event;
    }

    extractItem(q: SyncQueueItem): AppEvent | undefined {
        return q.type === SyncType.Event ? q.item : undefined;
    }

    updateOldMapSnapshot(items: AppEvent[]): void {
        this.context.updateOldEventsMap(items);
    }

    fetchRemoteItems(): ResultAsync<unknown[] | undefined, SyncError> {
        return ResultAsync.fromPromise(
            (async () => {
                const timeMin = new Date();
                timeMin.setMonth(timeMin.getMonth() - 1);
                const timeMax = new Date();
                timeMax.setMonth(timeMax.getMonth() + 2);

                const calendarsResult = await this.calendarAPI.fetchCalendars();
                if (calendarsResult.isErr()) throw calendarsResult.error;
                const calendars = calendarsResult.value;
                const prevCalendars = this.context.getLocalData("calendars") || [];
                this.context.setLocalData(
                    "calendars",
                    calendars.map((c) => {
                        const prev = prevCalendars.find((p) => p.id === c.id);
                        return { ...c, active: prev ? prev.active : c.primary || false };
                    }),
                );

                const allRemoteEvents: Array<AppEvent | { id: string, _deleted: boolean, updatedAt: number }> = [];
                await Promise.all(
                    calendars.map(async (cal) => {
                        const remoteEventsResult = await this.calendarAPI.fetchEvents(
                            timeMin.toISOString(),
                            timeMax.toISOString(),
                            cal.id,
                        );
                        if (remoteEventsResult.isOk() && remoteEventsResult.value) {
                            allRemoteEvents.push(
                                ...remoteEventsResult.value.map((e: gapi.client.calendar.Event) =>
                                    this.calendarAPI.toLocalEvent(e, cal.id),
                                ),
                            );
                        } else if (remoteEventsResult.isErr()) {
                            console.error("Failed to fetch remote events", remoteEventsResult.error);
                        }
                    })
                );

                return allRemoteEvents;
            })(),
            e => toSyncError(e)
        );
    }

    processSingleRemoteItem(
        remote: AppEvent | { id: string, _deleted?: boolean, updatedAt?: number },
        _localItemsArray: AppEvent[],
        localItemsMap: Map<string, AppEvent>
    ): boolean {
        const existingLocalEvent = localItemsMap.get(remote.id);
        return resolveConflict(remote, existingLocalEvent, localItemsMap);
    }



    computeDelta(currentEvents: AppEvent[]) {
        const actions = computeEventDeltaActions(currentEvents, this.context.oldEventsMap);
        for (const action of actions) {
            this.context.pushQueue.push(action);
        }
        this.context.updateOldEventsMap(currentEvents);
    }

    private actionHandlers: Record<string, (item: SyncQueueItem) => Promise<void>> = {
        [SyncAction.Create]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            const targetCalendarId = taskOrEvent.item.remoteCollectionId || "primary";
            const eventsData = this.context.getLocalData("events");
            const baseEventRemoteId = taskOrEvent.item.recurringEventId ? eventsData.find(e => e.id === taskOrEvent.item.recurringEventId)?.remoteId : undefined;
            const resResult = await this.calendarAPI.createEvent(
                taskOrEvent.item,
                { 
                    ...(baseEventRemoteId !== undefined ? { baseEventRemoteId } : {}), 
                    calendarId: targetCalendarId 
                }
            );
            if (resResult.isErr()) throw resResult.error;
            const res = resResult.value;
            if (res) {
                const events = this.context.getLocalData("events");
                const idx = events.findIndex((e) => e.id === taskOrEvent.item.id);
                const e = events[idx];
                if (idx !== -1 && e) {
                    events[idx] = {
                        ...e,
                        remoteId: res.remoteId,
                        remoteCollectionId: res.calendarId,
                    };
                    this.context.setLocalData("events", events);
                    this.context.updateOldEventsMap(events);
                } else {
                    const deleteResult = await this.calendarAPI.deleteEvent(res.remoteId, { calendarId: res.calendarId });
                    if (deleteResult.isErr()) throw deleteResult.error;
                }
            }
        },
        [SyncAction.Update]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            const events = this.context.getLocalData("events");
            const currentEvent = events.find((e) => e.id === taskOrEvent.item.id);
            const gid = currentEvent?.remoteId || taskOrEvent.remoteId;

            if (gid) {
                const eventsData = this.context.getLocalData("events");
                const baseEventRemoteId = taskOrEvent.item.recurringEventId ? eventsData.find(e => e.id === taskOrEvent.item.recurringEventId)?.remoteId : undefined;
                const updateResult = await this.calendarAPI.updateEvent(
                    gid,
                    taskOrEvent.item,
                    { 
                        ...(taskOrEvent.updatedFields !== undefined ? { updatedFields: taskOrEvent.updatedFields } : {}), 
                        ...(baseEventRemoteId !== undefined ? { baseEventRemoteId } : {}), 
                        ...(taskOrEvent.calendarId !== undefined ? { calendarId: taskOrEvent.calendarId } : {}) 
                    }
                );
                if (updateResult.isErr()) throw updateResult.error;
            }
        },
        [SyncAction.Delete]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            // Delete actions always have taskOrEvent.remoteId if they were queued correctly.
            // If deleted before Create finished, it's handled in the Create block.
            if (taskOrEvent.remoteId) {
                const deleteResult = await this.calendarAPI.deleteEvent(
                    taskOrEvent.remoteId,
                    taskOrEvent.calendarId ? { calendarId: taskOrEvent.calendarId } : undefined,
                );
                if (deleteResult.isErr()) throw deleteResult.error;
            }
        },
        [SyncAction.Move]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event || !taskOrEvent.remoteId || !taskOrEvent.calendarId || !taskOrEvent.destinationCalendarId) return;
            const moveResult = await this.calendarAPI.moveEvent(
                taskOrEvent.remoteId,
                taskOrEvent.calendarId,
                taskOrEvent.destinationCalendarId
            );
            if (moveResult.isErr()) throw moveResult.error;
        }
    };

    processPushItem(taskOrEvent: SyncQueueItem): ResultAsync<void, SyncError> {
        if (taskOrEvent.type !== SyncType.Event) return okAsync(undefined);
        const handler = this.actionHandlers[taskOrEvent.action];
        if (handler) {
            return ResultAsync.fromPromise(
                handler(taskOrEvent),
                e => toSyncError(e)
            );
        }
        return okAsync(undefined);
    }
}
