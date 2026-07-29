import { AbstractSynchronizer } from "./AbstractSynchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ICalendarAPI } from "../api-interfaces";
import type { AppEvent, AppTask } from "../../domain/models";
import { resolveConflict } from "./conflict-resolver";
import { computeEventDeltaActions } from "./event-differ";

export class EventSynchronizer extends AbstractSynchronizer<AppEvent> {
    private calendarAPI: ICalendarAPI;

    constructor(context: ISyncEngineContext, calendarAPI: ICalendarAPI) {
        super(context);
        this.calendarAPI = calendarAPI;
    }

    // Alias for backward compatibility
    pollEvents() {
        return this.poll();
    }

    protected isSyncEnabled(): boolean {
        return this.context.getSettings().enableCalendarSync !== false;
    }

    protected getLocalStoreKey(): string {
        return "events";
    }

    protected updatePrevMapSnapshot(items: AppEvent[]): void {
        this.context.updatePrevEventsMap(items);
    }

    protected async fetchRemoteItems(): Promise<any[] | null> {
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 2);

        const calendars = await this.calendarAPI.fetchCalendars();
        const prevCalendars = this.context.getLocalData<{id: string, summary: string, accessRole: string, active: boolean}[]>("calendars") || [];
        this.context.setLocalData(
            "calendars",
            calendars.map((c) => {
                const prev = prevCalendars.find(pc => pc.id === c.id);
                return { 
                    id: c.id, 
                    summary: c.summary, 
                    accessRole: c.accessRole, 
                    active: prev ? prev.active : true 
                };
            }),
        );

        const allRemoteEvents: (AppEvent & { _deleted?: boolean })[] = [];
        for (const cal of calendars) {
            const remoteEvents = await this.calendarAPI.fetchEvents(
                timeMin.toISOString(),
                timeMax.toISOString(),
                cal.id,
            );
            if (remoteEvents) {
                allRemoteEvents.push(
                    ...remoteEvents.map((e: gapi.client.calendar.Event) =>
                        this.calendarAPI.toLocalEvent(e, cal.id, cal.summary),
                    ),
                );
            }
        }
        return allRemoteEvents;
    }

    protected processSingleRemoteItem(
        remote: AppEvent & { _deleted?: boolean },
        _localItemsArray: AppEvent[],
        localItemsMap: Map<string, AppEvent>
    ): boolean {
        const existingLocalEvent = localItemsMap.get(remote.id);
        return resolveConflict(remote, existingLocalEvent, localItemsMap);
    }

    protected processQueueItem(q: SyncQueueItem, eventsMap: Map<string, AppEvent>): boolean {
        if (q.type !== SyncType.Event) return false;
        let updated = false;

        if (q.action === SyncAction.Delete) {
            if (q.item && q.item.id) eventsMap.delete(q.item.id);
            if (q.id) {
                for (const [key, event] of Array.from(eventsMap.entries())) {
                    if (event.googleEventId === q.id) {
                        eventsMap.delete(key);
                    }
                }
            }
            updated = true;
        } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create) && q.item && q.item.id) {
            eventsMap.set(q.item.id, q.item);
            updated = true;
        }
        return updated;
    }

    computeDelta(newEvents: AppEvent[]) {
        this.computeEventsDelta(newEvents);
    }

    computeEventsDelta(newEvents: AppEvent[]) {
        const calendars = this.context.getLocalData<{id: string, summary: string}[]>("calendars") || [];
        const actions = computeEventDeltaActions(newEvents, this.context.prevEventsMap, calendars);
        for (const action of actions) {
            this.context.pushQueue.push(action);
        }
        this.context.updatePrevEventsMap(newEvents);
    }

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Event) return;
        const tasks = this.context.getLocalData<AppTask[]>("tasks");
        let targetCalendarId =
            taskOrEvent.item.googleCalendarId || "primary";

        if (taskOrEvent.action === SyncAction.Create) {
            const res = await this.calendarAPI.createEvent(
                taskOrEvent.item,
                tasks,
                targetCalendarId,
            );
            if (res) {
                const events = this.context.getLocalData<AppEvent[]>("events");
                const idx = events.findIndex(
                    (e) => e.id === taskOrEvent.item.id,
                );
                if (idx !== -1) {
                    events[idx] = {
                        ...events[idx],
                        googleEventId: res.id,
                        googleCalendarId: res.calendarId,
                    };
                    this.context.setLocalData("events", events);
                    this.context.updatePrevEventsMap(events);
                }
            }
        } else if (
            taskOrEvent.action === SyncAction.Update &&
            taskOrEvent.id
        ) {
            await this.calendarAPI.updateEvent(
                taskOrEvent.id,
                taskOrEvent.item,
                tasks,
                taskOrEvent.calendarId,
            );
        } else if (
            taskOrEvent.action === SyncAction.Delete &&
            taskOrEvent.id
        ) {
            await this.calendarAPI.deleteEvent(
                taskOrEvent.id,
                taskOrEvent.calendarId,
            );
        }
    }
}
