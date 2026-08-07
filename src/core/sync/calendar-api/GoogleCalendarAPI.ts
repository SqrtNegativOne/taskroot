import { HTTP_GONE, HTTP_PRECONDITION_FAILED } from "../../utils/constants";
import { fetchWithRateLimitAndAuth } from "../google-api-utils";
import { toFloatingIso } from "../../utils/date-utils";
import { ConflictError } from "../errors";
import type { AppEvent } from "../../domain/models";
import { toEventType } from "../../domain/models";
import { isEventAllDay } from "../../domain/events";
import type { IAuthManager } from "../auth/types";
import type { ICalendarAPI } from "./types";
/// <reference types="gapi.client.calendar" />


export class GoogleCalendarAPI implements ICalendarAPI {
    private authManager: IAuthManager;
    constructor(authManager: IAuthManager) {
        this.authManager = authManager;
    }

    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        return fetchWithRateLimitAndAuth(`https://www.googleapis.com/calendar/v3/${endpoint}`, this.authManager, options);
    }

    async fetchEvents(timeMin: string, timeMax: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`);
        if (!res.ok) { console.warn(`Failed to fetch events for calendar ${calendarId}`); return undefined; }
        const data: gapi.client.calendar.Events = await res.json();
        return data.items || [];
    }

    async fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]> {
        const def = [{ id: "primary", summary: "Primary Calendar", accessRole: "owner", primary: true }];
        if (!this.authManager.getToken()) return def;
        const res = await this.fetchWithAuth("users/me/calendarList");
        if (!res.ok) { console.warn(`Failed to fetch calendars`); return def; }
        const data: gapi.client.calendar.CalendarList = await res.json();
        const items = data.items || [];
        const result: {id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[] = [];
        for (const c of items) {
            if (c.id && c.summary) {
                result.push({
                    id: c.id,
                    summary: c.summaryOverride || c.summary,
                    accessRole: c.accessRole,
                    backgroundColor: c.backgroundColor,
                    foregroundColor: c.foregroundColor,
                    primary: c.primary
                });
            }
        }
        return result.length > 0 ? result : def;
    }

    async createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): Promise<{ remoteId: string, calendarId: string }> {
        const calendarId = options?.calendarId || "primary";
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, options?.baseEventRemoteId))
        });
        if (!res.ok) throw new Error(`Failed to create event: ${res.status} ${await res.text()}`);
        const data: { id?: string } = await res.json();
        if (!data.id) throw new Error("Event created but no ID returned");
        return { remoteId: data.id, calendarId };
    }

    async updateEvent(remoteId: string, localEvent: AppEvent, options?: { updatedFields?: (keyof AppEvent)[], baseEventRemoteId?: string, calendarId?: string }) {
        const calendarId = options?.calendarId || "primary";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (localEvent.etag) headers["If-Match"] = localEvent.etag;

        const fullPayload = this.toGoogleEvent(localEvent, options?.baseEventRemoteId);
        const payloadToSubmit = options?.updatedFields && options.updatedFields.length > 0
            ? buildPartialEventPayload(options.updatedFields, fullPayload)
            : fullPayload;

        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${remoteId}`, {
            method: "PATCH", headers, body: JSON.stringify(payloadToSubmit)
        });
        
        if (res.status === HTTP_PRECONDITION_FAILED) throw new ConflictError(`ETag conflict on event: ${localEvent.title}`);
        if (!res.ok) throw new Error(`Failed to update event: ${res.status} ${await res.text()}`);
    }

    async moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string) {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(sourceCalendarId)}/events/${remoteId}/move?destination=${encodeURIComponent(destinationCalendarId)}`, {
            method: "POST"
        });
        if (!res.ok) throw new Error(`Failed to move event: ${res.status} ${await res.text()}`);
    }

    async deleteEvent(remoteId: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${remoteId}`, { method: "DELETE" });
        if (!res.ok) {
            if (res.status === HTTP_GONE) return;
            throw new Error(`Failed to delete event: ${res.status} ${await res.text()}`);
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
        
        if (localEvent.exdates) {
            for (const exdate of localEvent.exdates) {
                if (isEventAllDay(localEvent)) {
                    let dateOnly = exdate;
                    if (exdate.includes("T")) {
                        dateOnly = exdate.split("T")[0];
                    }
                    recurrence.push(`EXDATE;VALUE=DATE:${dateOnly}`);
                } else {
                    recurrence.push(`EXDATE;TZID=${timeZone}:${exdate}`);
                }
            }
        }
        
        const result: Partial<gapi.client.calendar.Event> = {};
        if (recurrence.length > 0) result.recurrence = recurrence;
        if (baseEventRemoteId) result.recurringEventId = baseEventRemoteId;
        if (localEvent.originalStartTime) {
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

function buildPartialEventPayload(updatedFields: (keyof AppEvent)[], fullPayload: gapi.client.calendar.Event) {
    const partialPayload: Partial<gapi.client.calendar.Event> = {};
    if (updatedFields.includes("title")) partialPayload.summary = fullPayload.summary;
    if (updatedFields.includes("startTime") || updatedFields.includes("endTime")) {
        partialPayload.start = fullPayload.start;
        partialPayload.end = fullPayload.end;
    }
    if (updatedFields.includes("type") || updatedFields.includes("taskId")) {
        partialPayload.extendedProperties = fullPayload.extendedProperties;
        partialPayload.transparency = fullPayload.transparency;
    }
    if (updatedFields.includes("rrule") || updatedFields.includes("exdates")) {
        partialPayload.recurrence = fullPayload.recurrence;
    }
    if (updatedFields.includes("recurringEventId")) partialPayload.recurringEventId = fullPayload.recurringEventId;
    if (updatedFields.includes("originalStartTime")) partialPayload.originalStartTime = fullPayload.originalStartTime;
    return partialPayload;
}

function handleCancelledEvent(googleEvent: gapi.client.calendar.Event) {
    const privateProps = googleEvent.extendedProperties?.private;
    const id = (privateProps ? privateProps.taskrootEventId : undefined) || googleEvent.id;
    if (!id) throw new Error("Cancelled Google event missing ID");
    return {
        id,
        _deleted: true,
        updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : 0,
    };
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
