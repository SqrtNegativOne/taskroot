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
        const tasks = this.context.getLocalData<import('../../domain/models').AppTask[]>("tasks"); // Needed for resolving task references
        this.context.updatePrevEventsMap(events);

        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 2);

        const calendars = await googleCalendarAPI.fetchCalendars();
        this.context.setLocalData(
            "calendars",
            calendars.map((c: any) => ({ id: c.id, summary: c.summary })),
        );

        const allRemoteEvents: any[] = [];
        for (const cal of calendars) {
            const remoteEvents = await googleCalendarAPI.fetchEvents(
                timeMin.toISOString(),
                timeMax.toISOString(),
                cal.id,
            );
            if (remoteEvents) {
                allRemoteEvents.push(
                    ...remoteEvents.map((e) =>
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
            const existingLocalEvent = eventsMap.get(remote.id);

            if (remote._deleted) {
                if (existingLocalEvent) {
                    const localUpdated = existingLocalEvent.updatedAt || 0;
                    if (remote.updatedAt > localUpdated) {
                        eventsMap.delete(existingLocalEvent.id);
                        updated = true;
                    }
                }
                continue;
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
        }

        // --- Optimistic Overlay ---
        for (const q of this.context.pushQueue.getItems()) {
            if (q.type === SyncType.Event) {
                if (q.action === SyncAction.Delete) {
                    if (q.item && q.item.id) eventsMap.delete(q.item.id);
                    if (q.id) {
                        for (const [key, event] of eventsMap.entries()) {
                            if (event.googleEventId === q.id) {
                                eventsMap.delete(key);
                            }
                        }
                    }
                    updated = true;
                } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create) && q.item && q.item.id) {
                    eventsMap.set(q.item.id, q.item as import('../../domain/models').AppEvent);
                    updated = true;
                }
            }
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
            const prev = this.context.prevEventsMap.get(event.id);
            if (!prev) {
                if (!event.googleEventId) {
                    this.context.pushQueue.push({
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

            const calendars = this.context.getLocalData<any[]>("calendars");
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
        const tasks = this.context.getLocalData<import('../../domain/models').AppTask[]>("tasks");
        let targetCalendarId =
            (taskOrEvent.item as import('../../domain/models').AppEvent).googleCalendarId as string || "primary";

        if (taskOrEvent.action === SyncAction.Create) {
            const res = await googleCalendarAPI.createEvent(
                taskOrEvent.item as import('../../domain/models').AppEvent,
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
                taskOrEvent.item as import('../../domain/models').AppEvent,
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
}
