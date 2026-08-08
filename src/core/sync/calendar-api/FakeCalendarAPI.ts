import { toFloatingIso } from "../../utils/date-utils";
import { ConflictError } from "../errors";
import type { AppEvent } from "../../domain/models";
import { toEventType } from "../../domain/models";
import { isEventAllDay } from "../../domain/events";
import type { ICalendarAPI } from "./types";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { type SyncError, UnknownError } from "../errors";

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

function handleCancelledEvent(googleEvent: gapi.client.calendar.Event) {
    const privateProps = googleEvent.extendedProperties?.private;
    const id = (privateProps ? privateProps["taskrootEventId"] : undefined) || googleEvent.id;
    if (!id) throw new Error("Cancelled Google event missing ID");
    return {
        id,
        _deleted: true,
        updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : 0,
    };
}

function getEventId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    if (priv?.["taskrootEventId"]) return priv["taskrootEventId"];
    if (!googleEvent.id) throw new Error("Google event missing ID");
    return googleEvent.id;
}

function getEventTaskId(googleEvent: gapi.client.calendar.Event) {
    return googleEvent.extendedProperties?.private?.["taskId"];
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const taskId = getEventTaskId(googleEvent);
    const id = getEventId(googleEvent);
    const defaultType: AppEvent['type'] = googleEvent.transparency === "transparent" ? "info" : "busy";
    const type = toEventType(googleEvent.extendedProperties?.private?.["type"], defaultType);
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
    return { ...(rrule !== undefined ? { rrule } : {}), ...(exdates.length > 0 ? { exdates } : {}) };
}

export class FakeCalendarAPI implements ICalendarAPI {
    private calendars: Record<string, gapi.client.calendar.Event[]> = {};

    public seedRemoteEvents(events: gapi.client.calendar.Event[], calendarId = "primary"): void {
        this.calendars[calendarId] = events;
    }

    private generateEtag(): string {
        return crypto.randomUUID();
    }

    fetchEvents(_timeMin: string, _timeMax: string, calendarId = "primary"): ResultAsync<gapi.client.calendar.Event[] | undefined, SyncError> {
        return okAsync(this.calendars[calendarId] || []);
    }

    fetchCalendars(): ResultAsync<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[], SyncError> {
        return okAsync([{ id: "primary", summary: "Primary Calendar", accessRole: "owner", primary: true }]);
    }

    createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): ResultAsync<{ remoteId: string, calendarId: string }, SyncError> {
        const calendarId = options?.calendarId || "primary";
        if (!this.calendars[calendarId]) this.calendars[calendarId] = [];
        const remoteId = "fake-g-id-" + crypto.randomUUID();
        const googleEvent = this.toGoogleEvent(localEvent, options?.baseEventRemoteId);
        googleEvent.id = remoteId;
        googleEvent.etag = this.generateEtag();
        googleEvent.updated = new Date().toISOString();
        this.calendars[calendarId].push(googleEvent);
        return okAsync({ remoteId, calendarId });
    }

    updateEvent(remoteId: string, localEvent: AppEvent, options?: { updatedFields?: (keyof AppEvent)[], baseEventRemoteId?: string, calendarId?: string }): ResultAsync<void, SyncError> {
        const calendarId = options?.calendarId || "primary";
        if (!this.calendars[calendarId]) this.calendars[calendarId] = [];
        const index = this.calendars[calendarId].findIndex(e => e.id === remoteId);
        if (index === -1) return errAsync(new UnknownError("Event not found"));
        
        const existingEvent = this.calendars[calendarId][index];
        if (!existingEvent) return errAsync(new UnknownError("Event not found"));
        if (localEvent.etag && existingEvent.etag !== localEvent.etag) {
            return errAsync(new ConflictError(`ETag conflict on event: ${localEvent.title}`));
        }
        
        const updatedEvent = this.toGoogleEvent(localEvent, options?.baseEventRemoteId);
        updatedEvent.id = remoteId;
        updatedEvent.etag = this.generateEtag();
        updatedEvent.updated = new Date().toISOString();
        this.calendars[calendarId][index] = updatedEvent;
        return okAsync(undefined);
    }

    moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string): ResultAsync<void, SyncError> {
        if (!this.calendars[sourceCalendarId]) return okAsync(undefined);
        const index = this.calendars[sourceCalendarId].findIndex(e => e.id === remoteId);
        if (index === -1) return errAsync(new UnknownError("Event not found"));

        const event = this.calendars[sourceCalendarId].splice(index, 1)[0];
        if (!event) return okAsync(undefined);
        event.etag = this.generateEtag();
        event.updated = new Date().toISOString();

        if (!this.calendars[destinationCalendarId]) this.calendars[destinationCalendarId] = [];
        this.calendars[destinationCalendarId].push(event);
        return okAsync(undefined);
    }

    deleteEvent(remoteId: string, options?: { calendarId?: string }): ResultAsync<void, SyncError> {
        const calendarId = options?.calendarId || "primary";
        if (!this.calendars[calendarId]) return okAsync(undefined);
        const index = this.calendars[calendarId].findIndex(e => e.id === remoteId);
        if (index !== -1) {
            const ev = this.calendars[calendarId][index];
            if (ev) {
                ev.status = "cancelled";
                ev.etag = this.generateEtag();
                ev.updated = new Date().toISOString();
            }
        }
        return okAsync(undefined);
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

    private buildGoogleExdates(localEvent: AppEvent, timeZone: string, recurrence: string[]) {
        if (!localEvent.exdates) return;
        
        const isAllDay = isEventAllDay(localEvent);
        for (const exdate of localEvent.exdates) {
            if (isAllDay) {
                const hasTime = exdate.includes("T");
                const dateOnly = hasTime ? (exdate.split("T")[0] || exdate) : exdate;
                recurrence.push(`EXDATE;VALUE=DATE:${dateOnly}`);
            } else {
                recurrence.push(`EXDATE;TZID=${timeZone}:${exdate}`);
            }
        }
    }

    private buildGoogleRecurrenceAndExceptions(localEvent: AppEvent, timeZone: string, baseEventRemoteId?: string) {
        const recurrence: string[] = [];
        const hasRrule = !!localEvent.rrule;
        if (hasRrule) recurrence.push(`RRULE:${localEvent.rrule}`);
        
        this.buildGoogleExdates(localEvent, timeZone, recurrence);
        
        const result: Partial<gapi.client.calendar.Event> = {};
        const hasRecurrence = recurrence.length > 0;
        if (hasRecurrence) result.recurrence = recurrence;
        const hasBaseRemoteId = !!baseEventRemoteId;
        if (hasBaseRemoteId) result.recurringEventId = baseEventRemoteId;
        const hasOriginalStart = !!localEvent.originalStartTime;
        if (hasOriginalStart) {
            result.originalStartTime = { dateTime: localEvent.originalStartTime, timeZone };
        }
        return result;
    }

    toLocalEvent(googleEvent: gapi.client.calendar.Event, calendarId = "primary") {
        if (googleEvent.status === "cancelled") {
            return handleCancelledEvent(googleEvent);
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
