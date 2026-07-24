import { googleCalendarAPI } from "../GoogleCalendarAPI";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";

export class EventSynchronizer {
    private context: ISyncEngineContext;
    constructor(context: ISyncEngineContext) {
        this.context = context;
    }

    async pollEvents() {
        const settings = this.context.getSettings();
        if (settings.enableCalendarSync === false) return;

        const events = this.context.getLocalData<import('../../domain/models').AppEvent[]>("events");
        this.context.updatePrevEventsMap(events);

        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 2);

        const calendars = await googleCalendarAPI.fetchCalendars();
        const prevCalendars = this.context.getLocalData<import('../../store/repositories').CalendarData[]>("calendars");
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

        const allRemoteEvents: (import('../../domain/models').AppEvent & { _deleted?: boolean })[] = [];
        for (const cal of calendars) {
            const remoteEvents = await googleCalendarAPI.fetchEvents(
                timeMin.toISOString(),
                timeMax.toISOString(),
                cal.id,
            );
            if (remoteEvents) {
                allRemoteEvents.push(
                    ...remoteEvents.map((e: gapi.client.calendar.Event) =>
                        googleCalendarAPI.toLocalEvent(e, cal.id, cal.summary),
                    ),
                );
            }
        }

        let updated = false;
        const eventsMap = new Map<string, import('../../domain/models').AppEvent>(
            events.map((e) => [e.id, e]),
        );

        for (const remote of allRemoteEvents) {
            if (this.processSingleRemoteEvent(remote, eventsMap)) {
                updated = true;
            }
        }

        // --- Optimistic Overlay ---
        if (this.applyOptimisticOverlay(eventsMap)) {
            updated = true;
        }

        if (updated) {
            const newEvents = Array.from(eventsMap.values());
            this.context.setLocalData("events", newEvents);
            this.context.updatePrevEventsMap(newEvents);
        }
    }

    computeEventsDelta(newEvents: import('../../domain/models').AppEvent[]) {
        const newEventsMap = new Map(newEvents.map((e) => [e.id, e]));

        for (const event of newEvents) {
            this.handleComputeEventDelta(event, newEventsMap);
        }

        for (const [id, prev] of this.context.prevEventsMap.entries()) {
            if (!newEventsMap.has(id) && prev.googleEventId) {
                this.context.pushQueue.push({
                    type: SyncType.Event,
                    action: SyncAction.Delete,
                    item: prev,
                    id: prev.googleEventId,
                    calendarId: prev.googleCalendarId || "primary",
                });
            }
        }

        this.context.updatePrevEventsMap(newEvents);
    }

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Event) return;
        const tasks = this.context.getLocalData<import('../../domain/models').AppTask[]>("tasks");
        let targetCalendarId =
            taskOrEvent.item.googleCalendarId || "primary";

        if (taskOrEvent.action === SyncAction.Create) {
            const res = await googleCalendarAPI.createEvent(
                taskOrEvent.item,
                tasks,
                targetCalendarId,
            );
            if (res) {
                const events = this.context.getLocalData<import('../../domain/models').AppEvent[]>("events");
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
            await googleCalendarAPI.updateEvent(
                taskOrEvent.id,
                taskOrEvent.item,
                tasks,
                taskOrEvent.calendarId,
            );
        } else if (
            taskOrEvent.action === SyncAction.Delete &&
            taskOrEvent.id
        ) {
            await googleCalendarAPI.deleteEvent(
                taskOrEvent.id,
                taskOrEvent.calendarId,
            );
        }
    }

    private processSingleRemoteEvent(
        remote: import('../../domain/models').AppEvent & { _deleted?: boolean },
        eventsMap: Map<string, import('../../domain/models').AppEvent>
    ): boolean {
        let updated = false;
        const existingLocalEvent = eventsMap.get(remote.id);

        if (remote._deleted) {
            if (existingLocalEvent) {
                const localUpdated = existingLocalEvent.updatedAt || 0;
                if ((remote.updatedAt || 0) > localUpdated) {
                    eventsMap.delete(existingLocalEvent.id);
                    updated = true;
                }
            }
            return updated;
        }

        if (existingLocalEvent) {
            const localUpdated = existingLocalEvent.updatedAt || 0;
            const remoteUpdated = remote.updatedAt || 0;

            if (remoteUpdated > localUpdated) {
                eventsMap.set(existingLocalEvent.id, remote);
                updated = true;
            }
        } else {
            eventsMap.set(remote.id, remote);
            updated = true;
        }
        return updated;
    }

    private processQueueItem(q: SyncQueueItem, eventsMap: Map<string, import('../../domain/models').AppEvent>): boolean {
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

    private applyOptimisticOverlay(eventsMap: Map<string, import('../../domain/models').AppEvent>): boolean {
        let updated = false;
        for (const q of this.context.pushQueue.getItems()) {
            if (this.processQueueItem(q, eventsMap)) {
                updated = true;
            }
        }
        return updated;
    }

    private handleComputeEventDelta(event: import('../../domain/models').AppEvent, _newEventsMap: Map<string, import('../../domain/models').AppEvent>) {
        const prev = this.context.prevEventsMap.get(event.id);
        if (!prev) {
            if (!event.googleEventId) {
                this.context.pushQueue.push({
                    type: SyncType.Event,
                    action: SyncAction.Create,
                    item: event,
                });
            }
            return;
        }

        if (!(
            event.updatedAt &&
            prev.updatedAt &&
            event.updatedAt > prev.updatedAt
        )) {
            return;
        }

        const calendars = this.context.getLocalData<{id: string, summary: string}[]>("calendars");
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
                this.context.pushQueue.push({
                    type: SyncType.Event,
                    action: SyncAction.Delete,
                    item: prev,
                    id: prev.googleEventId,
                    calendarId: prev.googleCalendarId,
                });
            }
            this.context.pushQueue.push({
                type: SyncType.Event,
                action: SyncAction.Create,
                item: event,
            });
        } else if (event.googleEventId) {
            this.context.pushQueue.push({
                type: SyncType.Event,
                action: SyncAction.Update,
                item: event,
                id: event.googleEventId,
                calendarId: targetCalendarId,
            });
        } else {
            this.context.pushQueue.push({
                type: SyncType.Event,
                action: SyncAction.Create,
                item: event,
            });
        }
    }
}
