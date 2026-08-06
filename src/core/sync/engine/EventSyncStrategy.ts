import type { ISyncStrategy } from "./Synchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ICalendarAPI } from "../calendar-api/types";
import type { AppEvent, AppTask } from "../../domain/models";
import { resolveConflict } from "./conflict-resolver";
import { computeEventDeltaActions } from "./event-differ";

export class EventSyncStrategy implements ISyncStrategy<AppEvent> {
    private context: ISyncEngineContext;
    private calendarAPI: ICalendarAPI;

    constructor(context: ISyncEngineContext, calendarAPI: ICalendarAPI) {
        this.context = context;
        this.calendarAPI = calendarAPI;
    }

    isSyncEnabled(): boolean {
        return this.context.getSettings().enableCalendarSync !== false;
    }

    getLocalStoreKey(): string {
        return "events";
    }

    updateOldMapSnapshot(items: AppEvent[]): void {
        this.context.updateOldEventsMap(items);
    }

    async fetchRemoteItems(): Promise<unknown[] | undefined> {
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 2);

        const calendars = await this.calendarAPI.fetchCalendars();
        const prevCalendars = this.context.getLocalData<{id: string, summary: string, accessRole: string, active: boolean, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]>("calendars") || [];
        this.context.setLocalData(
            "calendars",
            calendars.map((c) => {
                const prev = prevCalendars.find(pc => pc.id === c.id);
                return { 
                    id: c.id, 
                    summary: c.summary, 
                    accessRole: c.accessRole, 
                    active: prev ? prev.active : true,
                    backgroundColor: c.backgroundColor,
                    foregroundColor: c.foregroundColor,
                    primary: c.primary
                };
            }),
        );

        const allRemoteEvents: Array<AppEvent | { id: string, _deleted: boolean, updatedAt: number }> = [];
        await Promise.all(
            calendars.map(async (cal) => {
                const remoteEvents = await this.calendarAPI.fetchEvents(
                    timeMin.toISOString(),
                    timeMax.toISOString(),
                    cal.id,
                );
                if (remoteEvents) {
                    allRemoteEvents.push(
                        ...remoteEvents.map((e: gapi.client.calendar.Event) =>
                            this.calendarAPI.toLocalEvent(e, cal.id),
                        ),
                    );
                }
            })
        );
        return allRemoteEvents;
    }

    processSingleRemoteItem(
        remote: AppEvent | { id: string, _deleted?: boolean, updatedAt?: number },
        _localItemsArray: AppEvent[],
        localItemsMap: Map<string, AppEvent>
    ): boolean {
        const existingLocalEvent = localItemsMap.get(remote.id);
        return resolveConflict(remote, existingLocalEvent, localItemsMap);
    }

    processQueueItem(q: SyncQueueItem, eventsMap: Map<string, AppEvent>): boolean {
        if (q.type !== SyncType.Event) return false;
        let updated = false;

        if (q.action === SyncAction.Delete) {
            if (q.item && q.item.id) eventsMap.delete(q.item.id);
            if (q.remoteId) {
                for (const [key, event] of Array.from(eventsMap.entries())) {
                    if (event.remoteId === q.remoteId) {
                        eventsMap.delete(key);
                    }
                }
            }
            updated = true;
        } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create || q.action === SyncAction.Move) && q.item && q.item.id) {
            const existing = eventsMap.get(q.item.id);
            if ((q.action === SyncAction.Update || q.action === SyncAction.Move) && q.updatedFields && existing) {
                const partialUpdate: Partial<AppEvent> = {};
                for (const field of q.updatedFields) {
                    Object.defineProperty(partialUpdate, field, {
                        value: q.item[field],
                        enumerable: true,
                        writable: true,
                        configurable: true,
                    });
                }
                Object.defineProperty(partialUpdate, "updatedAt", {
                    value: Math.max(q.item.updatedAt || 0, existing.updatedAt || 0),
                    enumerable: true,
                    writable: true,
                    configurable: true,
                });
                eventsMap.set(q.item.id, { ...existing, ...partialUpdate });
            } else {
                eventsMap.set(q.item.id, q.item);
            }
            updated = true;
        }
        return updated;
    }

    computeDelta(currentEvents: AppEvent[]) {
        const actions = computeEventDeltaActions(currentEvents, this.context.oldEventsMap);
        for (const action of actions) {
            this.context.pushQueue.push(action);
        }
        this.context.updateOldEventsMap(currentEvents);
    }

    private actionHandlers: Record<string, (item: SyncQueueItem, tasks: AppTask[]) => Promise<void>> = {
        [SyncAction.Create]: async (taskOrEvent, tasks) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            const targetCalendarId = taskOrEvent.item.remoteCollectionId || "primary";
            const eventsData = this.context.getLocalData<AppEvent[]>("events");
            const baseEventRemoteId = taskOrEvent.item.recurringEventId ? eventsData.find(e => e.id === taskOrEvent.item.recurringEventId)?.remoteId : undefined;
            const res = await this.calendarAPI.createEvent(
                taskOrEvent.item,
                { baseEventRemoteId, calendarId: targetCalendarId }
            );
            if (res) {
                const events = this.context.getLocalData<AppEvent[]>("events");
                const idx = events.findIndex((e) => e.id === taskOrEvent.item.id);
                if (idx !== -1) {
                    events[idx] = {
                        ...events[idx],
                        remoteId: res.remoteId,
                        remoteCollectionId: res.calendarId,
                    };
                    this.context.setLocalData("events", events);
                    this.context.updateOldEventsMap(events);
                } else {
                    await this.calendarAPI.deleteEvent(res.remoteId, res.calendarId);
                }
            }
        },
        [SyncAction.Update]: async (taskOrEvent, tasks) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            const events = this.context.getLocalData<AppEvent[]>("events");
            const currentEvent = events.find((e) => e.id === taskOrEvent.item.id);
            const gid = currentEvent?.remoteId || taskOrEvent.remoteId;

            if (gid) {
                const eventsData = this.context.getLocalData<AppEvent[]>("events");
                const baseEventRemoteId = taskOrEvent.item.recurringEventId ? eventsData.find(e => e.id === taskOrEvent.item.recurringEventId)?.remoteId : undefined;
                await this.calendarAPI.updateEvent(
                    gid,
                    taskOrEvent.item,
                    { updatedFields: taskOrEvent.updatedFields, baseEventRemoteId, calendarId: taskOrEvent.calendarId }
                );
            }
        },
        [SyncAction.Delete]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event) return;
            // Delete actions always have taskOrEvent.remoteId if they were queued correctly.
            // If deleted before Create finished, it's handled in the Create block.
            if (taskOrEvent.remoteId) {
                await this.calendarAPI.deleteEvent(
                    taskOrEvent.remoteId,
                    taskOrEvent.calendarId,
                );
            }
        },
        [SyncAction.Move]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Event || !taskOrEvent.remoteId || !taskOrEvent.calendarId || !taskOrEvent.destinationCalendarId) return;
            await this.calendarAPI.moveEvent(
                taskOrEvent.remoteId,
                taskOrEvent.calendarId,
                taskOrEvent.destinationCalendarId
            );
        }
    };

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Event) return;
        const tasks = this.context.getLocalData<AppTask[]>("tasks");
        const handler = this.actionHandlers[taskOrEvent.action];
        if (handler) await handler(taskOrEvent, tasks);
    }
}
