import { toFloatingIso } from "../../utils/date-utils";
import { ConflictError } from "../errors";
import type { AppEvent } from "../../domain/models";
import { toEventType } from "../../domain/models";
import { isEventAllDay } from "../../domain/events";
import type { ICalendarAPI } from "./types";

/// <reference types="gapi.client.calendar" />

function extractEventTime(googleEvent: gapi.client.calendar.Event) {
    if (googleEvent.start?.dateTime) {
        return {
            startTime: toFloatingIso(new Date(googleEvent.start.dateTime)),
            endTime: toFloatingIso(new Date(googleEvent.end?.dateTime || googleEvent.start.dateTime))
        };
    }
    if (!googleEvent.start?.date) throw new Error("Google event missing time information");
    
    const startDate = googleEvent.start.date;
    const endDate = googleEvent.end?.date || startDate;
    return { startTime: startDate, endTime: endDate }; 
}

function getEventId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    if (priv?.taskrootEventId) return priv.taskrootEventId;
    if (!googleEvent.id) throw new Error("Google event missing ID");
    return googleEvent.id;
}

function getEventTaskId(googleEvent: gapi.client.calendar.Event) {
    return googleEvent.extendedProperties?.private?.taskId;
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const taskId = getEventTaskId(googleEvent);
    const id = getEventId(googleEvent);
    const defaultType: AppEvent['type'] = googleEvent.transparency === "transparent" ? "info" : "busy";
    const type = toEventType(googleEvent.extendedProperties?.private?.type, defaultType);
    return { taskId, id, type };
}

function parseRecurrenceRule(recurrence?: string[]): { rrule?: string, exdates?: string[] } {
    if (!recurrence) return {};
    const r = recurrence.find((ruleStr) => ruleStr.startsWith("RRULE:"));
    const rrule = r ? r.replace(/^RRULE:/i, "") : undefined;
    
    const exdates: string[] = [];
    for (const ruleStr of recurrence) {
        if (ruleStr.startsWith("EXDATE")) {
            const parts = ruleStr.split(":");
            if (parts.length > 1) {
                exdates.push(parts.slice(1).join(":"));
            }
        }
    }
    return { rrule, ...(exdates.length > 0 ? { exdates } : {}) };
}

export class FakeCalendarAPI implements ICalendarAPI {
    private calendars: Record<string, gapi.client.calendar.Event[]> = {};

    public seedRemoteEvents(events: gapi.client.calendar.Event[], calendarId = "primary"): void {
        this.calendars[calendarId] = events;
    }

    private generateEtag(): string {
        return crypto.randomUUID();
    }

    async fetchEvents(_timeMin: string, _timeMax: string, calendarId = "primary"): Promise<gapi.client.calendar.Event[] | undefined> {
        return this.calendars[calendarId] || [];
    }

    async fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]> {
        return [{ id: "primary", summary: "Primary Calendar", accessRole: "owner", primary: true }];
    }

    async createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): Promise<{ remoteId: string, calendarId: string }> {
        const calendarId = options?.calendarId || "primary";
        if (!this.calendars[calendarId]) this.calendars[calendarId] = [];
        const remoteId = "fake-g-id-" + crypto.randomUUID();
        const googleEvent = this.toGoogleEvent(localEvent, options?.baseEventRemoteId);
        googleEvent.id = remoteId;
        googleEvent.etag = this.generateEtag();
        googleEvent.updated = new Date().toISOString();
        this.calendars[calendarId].push(googleEvent);
        return { remoteId, calendarId };
    }

    async updateEvent(remoteId: string, localEvent: AppEvent, options?: { updatedFields?: (keyof AppEvent)[], baseEventRemoteId?: string, calendarId?: string }): Promise<void> {
        const calendarId = options?.calendarId || "primary";
        if (!this.calendars[calendarId]) this.calendars[calendarId] = [];
        const index = this.calendars[calendarId].findIndex(e => e.id === remoteId);
        if (index === -1) throw new Error("Event not found");
        
        const existingEvent = this.calendars[calendarId][index];
        if (localEvent.etag && existingEvent.etag !== localEvent.etag) {
            throw new ConflictError(`ETag conflict on event: ${localEvent.title}`);
        }
        
        const updatedEvent = this.toGoogleEvent(localEvent, ctx);
        updatedEvent.id = remoteId;
        updatedEvent.etag = this.generateEtag();
        updatedEvent.updated = new Date().toISOString();
        this.calendars[calendarId][index] = updatedEvent;
    }

    async moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string): Promise<void> {
        if (!this.calendars[sourceCalendarId]) return;
        const index = this.calendars[sourceCalendarId].findIndex(e => e.id === remoteId);
        if (index === -1) throw new Error("Event not found");

        const event = this.calendars[sourceCalendarId].splice(index, 1)[0];
        if (!event) return;
        event.etag = this.generateEtag();
        event.updated = new Date().toISOString();

        if (!this.calendars[destinationCalendarId]) this.calendars[destinationCalendarId] = [];
        this.calendars[destinationCalendarId].push(event);
    }

    async deleteEvent(remoteId: string, calendarId = "primary"): Promise<void> {
        if (!this.calendars[calendarId]) return;
        const index = this.calendars[calendarId].findIndex(e => e.id === remoteId);
        if (index !== -1) {
            this.calendars[calendarId][index].status = "cancelled";
            this.calendars[calendarId][index].etag = this.generateEtag();
            this.calendars[calendarId][index].updated = new Date().toISOString();
        }
    }

    toGoogleEvent(localEvent: AppEvent, baseEventRemoteId?: string): gapi.client.calendar.Event {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        let startObj: gapi.client.calendar.EventDateTime;
        let endObj: gapi.client.calendar.EventDateTime;

        if (isEventAllDay(localEvent)) {
            startObj = { date: localEvent.startTime };
            endObj = { date: localEvent.endTime };
        } else {
            startObj = { dateTime: localEvent.startTime, timeZone };
            endObj = { dateTime: localEvent.endTime, timeZone };
        }

        return {
            summary: localEvent.title ?? "",
            start: startObj,
            end: endObj,
            description: localEvent.description ?? "",
            transparency: localEvent.type === "info" ? "transparent" : "opaque",
            extendedProperties: {
                private: {
                    taskrootEventId: localEvent.id,
                    ...(localEvent.taskId ? { taskId: localEvent.taskId } : {}),
                    type: localEvent.type ?? "",
                },
            },
            ...this.buildGoogleRecurrenceAndExceptions(localEvent, timeZone, baseEventRemoteId)
        };
    }

    private buildGoogleRecurrenceAndExceptions(localEvent: AppEvent, timeZone: string, baseEventRemoteId?: string) {
        const recurrence: string[] = [];
        if (localEvent.rrule) recurrence.push(`RRULE:${localEvent.rrule}`);
        if (localEvent.exdates && localEvent.exdates.length > 0) {
            for (const exdate of localEvent.exdates) {
                if (isEventAllDay(localEvent)) {
                    const dateOnly = exdate.includes("T") ? exdate.split("T")[0] : exdate;
                    recurrence.push(`EXDATE;VALUE=DATE:${dateOnly}`);
                } else {
                    recurrence.push(`EXDATE;TZID=${timeZone}:${exdate}`);
                }
            }
        }
        

        return {
            ...(recurrence.length > 0 ? { recurrence } : {}),
            ...(baseEventRemoteId ? { recurringEventId: baseEventRemoteId } : {}),
            ...(localEvent.originalStartTime ? { originalStartTime: { dateTime: localEvent.originalStartTime, timeZone } } : {})
        };
    }

    // oxlint-disable-next-line eslint/complexity
    toLocalEvent(googleEvent: gapi.client.calendar.Event, calendarId = "primary") {
        if (googleEvent.status === "cancelled") {
            const privateProps = googleEvent.extendedProperties?.private;
            const id = (privateProps ? privateProps.taskrootEventId : undefined) || googleEvent.id;
            if (!id) throw new Error("Cancelled Google event missing ID");
            return {
                id,
                _deleted: true,
                updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : 0,
            };
        }
        const { startTime, endTime } = extractEventTime(googleEvent);
        const { taskId, id, type } = extractEventMetadata(googleEvent);
        const { rrule, exdates } = parseRecurrenceRule(googleEvent.recurrence);

        const rruleProps = rrule ? { rrule } : {};
        const exdatesProps = exdates ? { exdates } : {};
        const recurProps = googleEvent.recurringEventId ? { recurringEventId: googleEvent.recurringEventId } : {};
        const originalStartTime = googleEvent.originalStartTime?.dateTime || googleEvent.originalStartTime?.date;
        const origProps = originalStartTime ? { originalStartTime } : {};

        return {
            id, remoteId: googleEvent.id, remoteCollectionId: calendarId, taskId,
            title: googleEvent.summary ?? "", startTime, endTime, type,
            updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now(),
            etag: googleEvent.etag,
            ...rruleProps,
            ...exdatesProps,
            ...recurProps,
            ...origProps
        };
    }
}
