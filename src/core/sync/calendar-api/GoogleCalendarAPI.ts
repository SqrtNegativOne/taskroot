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
        const result = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`);
        if (result.isErr()) throw result.error;
        const res = result.value;
        if (!res.ok) { console.warn(`Failed to fetch events for calendar ${calendarId}`); return undefined; }
        const data: gapi.client.calendar.Events = await res.json();
        return data.items || [];
    }

    private mapCalendarItem(c: gapi.client.calendar.CalendarListEntry) {
        const hasAccessRole = c.accessRole !== undefined;
        const hasBackgroundColor = c.backgroundColor !== undefined;
        const hasForegroundColor = c.foregroundColor !== undefined;
        const hasPrimary = c.primary !== undefined;
        return {
            id: c.id ?? "",
            summary: c.summaryOverride || (c.summary ?? ""),
            ...(hasAccessRole ? { accessRole: c.accessRole } : {}),
            ...(hasBackgroundColor ? { backgroundColor: c.backgroundColor } : {}),
            ...(hasForegroundColor ? { foregroundColor: c.foregroundColor } : {}),
            ...(hasPrimary ? { primary: c.primary } : {})
        };
    }

    async fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]> {
        const def = [{ id: "primary", summary: "Primary Calendar", accessRole: "owner", primary: true }];
        if (!this.authManager.getToken()) return def;
        const fetchResult = await this.fetchWithAuth("users/me/calendarList");
        if (fetchResult.isErr()) throw fetchResult.error;
        const res = fetchResult.value;
        if (!res.ok) { console.warn(`Failed to fetch calendars`); return def; }
        const data: gapi.client.calendar.CalendarList = await res.json();
        const items = data.items || [];
        const result: {id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[] = [];
        for (const c of items) {
            const hasIdAndSummary = c.id && c.summary;
            if (hasIdAndSummary) {
                result.push(this.mapCalendarItem(c));
            }
        }
        const hasResults = result.length > 0;
        return hasResults ? result : def;
    }

    async createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): Promise<{ remoteId: string, calendarId: string }> {
        const calendarId = options?.calendarId || "primary";
        const result = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, options?.baseEventRemoteId))
        });
        if (result.isErr()) throw result.error;
        const res = result.value;
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

        const result = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${remoteId}`, {
            method: "PATCH", headers, body: JSON.stringify(payloadToSubmit)
        });
        if (result.isErr()) throw result.error;
        const res = result.value;
        
        if (res.status === HTTP_PRECONDITION_FAILED) throw new ConflictError(`ETag conflict on event: ${localEvent.title}`);
        if (!res.ok) throw new Error(`Failed to update event: ${res.status} ${await res.text()}`);
    }

    async moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string) {
        const result = await this.fetchWithAuth(`calendars/${encodeURIComponent(sourceCalendarId)}/events/${remoteId}/move?destination=${encodeURIComponent(destinationCalendarId)}`, {
            method: "POST"
        });
        if (result.isErr()) throw result.error;
        const res = result.value;
        if (!res.ok) throw new Error(`Failed to move event: ${res.status} ${await res.text()}`);
    }

    async deleteEvent(remoteId: string, calendarId = "primary") {
        const result = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${remoteId}`, { method: "DELETE" });
        if (result.isErr()) throw result.error;
        const res = result.value;
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

function applyTimeAndTitleUpdates(updatedFields: (keyof AppEvent)[], fullPayload: gapi.client.calendar.Event, partialPayload: Partial<gapi.client.calendar.Event>) {
    const hasTimeUpdate = updatedFields.includes("startTime") || updatedFields.includes("endTime");
    
    const summaryVal = fullPayload.summary;
    const incSummary = updatedFields.includes("title") && summaryVal !== undefined;
    if (incSummary) partialPayload.summary = summaryVal;

    const startVal = fullPayload.start;
    const incStart = hasTimeUpdate && startVal !== undefined;
    if (incStart) partialPayload.start = startVal;

    const endVal = fullPayload.end;
    const incEnd = hasTimeUpdate && endVal !== undefined;
    if (incEnd) partialPayload.end = endVal;
}

function applyMetadataUpdates(updatedFields: (keyof AppEvent)[], fullPayload: gapi.client.calendar.Event, partialPayload: Partial<gapi.client.calendar.Event>) {
    const hasTypeOrTaskUpdate = updatedFields.includes("type") || updatedFields.includes("taskId");
    
    const extPropsVal = fullPayload.extendedProperties;
    const incExtProps = hasTypeOrTaskUpdate && extPropsVal !== undefined;
    if (incExtProps) partialPayload.extendedProperties = extPropsVal;
    
    const transpVal = fullPayload.transparency;
    const incTransp = hasTypeOrTaskUpdate && transpVal !== undefined;
    if (incTransp) partialPayload.transparency = transpVal;
}

function applyRecurrenceUpdates(updatedFields: (keyof AppEvent)[], fullPayload: gapi.client.calendar.Event, partialPayload: Partial<gapi.client.calendar.Event>) {
    const hasRecurrenceUpdate = updatedFields.includes("rrule") || updatedFields.includes("exdates");
    
    const recVal = fullPayload.recurrence;
    const incRecurrence = hasRecurrenceUpdate && recVal !== undefined;
    if (incRecurrence) partialPayload.recurrence = recVal;
    
    const recurIdVal = fullPayload.recurringEventId;
    const incRecurringId = updatedFields.includes("recurringEventId") && recurIdVal !== undefined;
    if (incRecurringId) partialPayload.recurringEventId = recurIdVal;
    
    const origStartVal = fullPayload.originalStartTime;
    const incOriginalStart = updatedFields.includes("originalStartTime") && origStartVal !== undefined;
    if (incOriginalStart) partialPayload.originalStartTime = origStartVal;
}

function buildPartialEventPayload(updatedFields: (keyof AppEvent)[], fullPayload: gapi.client.calendar.Event) {
    const partialPayload: Partial<gapi.client.calendar.Event> = {};
    applyTimeAndTitleUpdates(updatedFields, fullPayload, partialPayload);
    applyMetadataUpdates(updatedFields, fullPayload, partialPayload);
    applyRecurrenceUpdates(updatedFields, fullPayload, partialPayload);
    return partialPayload;
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
