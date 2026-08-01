import { HTTP_UNAUTHORIZED, HTTP_GONE, HTTP_FORBIDDEN, HTTP_TOO_MANY_REQUESTS, MS_PER_SECOND } from "../../utils/constants";
import { fetchWithTimeout } from "../../store/api";
import type { AppTask, AppEvent } from "../../domain/models";
import type { IAuthManager } from "../auth/types";
import type { ICalendarAPI } from "./types";
/// <reference types="gapi.client.calendar" />


export class GoogleCalendarAPI implements ICalendarAPI {
    private authManager: IAuthManager;
    constructor(authManager: IAuthManager) {
        this.authManager = authManager;
    }

    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        const getOpts = (t: string) => ({ ...options, headers: { ...options.headers, Authorization: `Bearer ${t}` } });
        let token = this.authManager.getToken();
        if (!token) throw new Error("Unauthorized");
        
        let res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/${endpoint}`, getOpts(token));
        
        if (res.status === HTTP_UNAUTHORIZED) {
            if (!await this.authManager.refreshAccessToken()) throw new Error("Unauthorized");
            token = this.authManager.getToken();
            if (!token) throw new Error("Unauthorized");
            res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/${endpoint}`, getOpts(token));
        }
        
        let attempts = 0;
        const maxAttempts = 3;
        while ((res.status === HTTP_FORBIDDEN || res.status === HTTP_TOO_MANY_REQUESTS) && attempts < maxAttempts) {
            const clone = res.clone();
            try {
                // We use any here because Google API error shapes vary and we only need to check the reason fields.
                // Necessary for parsing rate limit errors sequentially
                // eslint-disable-next-line no-await-in-loop
                const data: { error?: { errors?: { reason?: string }[] } } = await clone.json();
                const isRateLimit = res.status === HTTP_TOO_MANY_REQUESTS || (data?.error?.errors?.some(e => e.reason === "rateLimitExceeded" || e.reason === "userRateLimitExceeded"));
                if (isRateLimit) {
                    attempts++;
                    const delay = Math.pow(2, attempts) * MS_PER_SECOND + Math.random() * MS_PER_SECOND;
                    // Necessary for exponential backoff delay
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // Necessary for sequential retry of the failed request
                    // eslint-disable-next-line no-await-in-loop
                    res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/${endpoint}`, getOpts(token));
                } else {
                    break;
                }
            } catch {
                break;
            }
        }
        return res;
    }

    async fetchEvents(timeMin: string, timeMax: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`);
        if (!res.ok) { console.warn(`Failed to fetch events for calendar ${calendarId}`); return undefined; }
        const data: { items?: gapi.client.calendar.Event[] } = await res.json();
        return data.items || [];
    }

    async fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]> {
        const def = [{ id: "primary", summary: "Primary Calendar", accessRole: "owner", primary: true }];
        if (!this.authManager.getToken()) return def;
        const res = await this.fetchWithAuth("users/me/calendarList");
        if (!res.ok) { console.warn(`Failed to fetch calendars`); return def; }
        const data: { items?: {id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[] } = await res.json();
        return data.items || def;
    }

    async createEvent(localEvent: AppEvent, tasks: AppTask[], calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, tasks))
        });
        if (!res.ok) throw new Error(`Failed to create event: ${res.status} ${await res.text()}`);
        const data: { id?: string } = await res.json();
        if (!data.id) throw new Error("Event created but no ID returned");
        return { googleId: data.id, calendarId };
    }

    async updateEvent(googleId: string, localEvent: AppEvent, tasks: AppTask[], calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${googleId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, tasks))
        });
        if (!res.ok) throw new Error(`Failed to update event: ${res.status} ${await res.text()}`);
    }

    async moveEvent(googleId: string, sourceCalendarId: string, destinationCalendarId: string) {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(sourceCalendarId)}/events/${googleId}/move?destination=${encodeURIComponent(destinationCalendarId)}`, {
            method: "POST"
        });
        if (!res.ok) throw new Error(`Failed to move event: ${res.status} ${await res.text()}`);
    }

    async deleteEvent(googleId: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${googleId}`, { method: "DELETE" });
        if (!res.ok) {
            if (res.status === HTTP_GONE) return;
            throw new Error(`Failed to delete event: ${res.status} ${await res.text()}`);
        }
    }

    toGoogleEvent(localEvent: AppEvent, _tasks: AppTask[]): gapi.client.calendar.Event {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        let startObj: gapi.client.calendar.EventDateTime;
        let endObj: gapi.client.calendar.EventDateTime;

        if (localEvent.isAllDay) {
            startObj = { date: localEvent.startTime.split("T")[0] };
            endObj = { date: localEvent.endTime.split("T")[0] };
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
            ...(localEvent.rrule ? { recurrence: [`RRULE:${localEvent.rrule}`] } : {})
        };
    }

    toLocalEvent(googleEvent: gapi.client.calendar.Event, calendarId = "primary", calendarSummary = "") {
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
        const { startTime, endTime, isAllDay } = extractEventTime(googleEvent);
        const { taskId, id, type } = extractEventMetadata(googleEvent);
        const rrule = parseRecurrenceRule(googleEvent.recurrence);

        return {
            id, googleId: googleEvent.id, googleCalendarId: calendarId, taskId,
            title: googleEvent.summary ?? "", startTime, endTime, type,
            category: calendarSummary, rrule, isAllDay,
            updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now(),
        };
    }
}

function extractEventTime(googleEvent: gapi.client.calendar.Event) {
    if (googleEvent.start?.dateTime) {
        const startDt = new Date(googleEvent.start.dateTime);
        const endDt = new Date(googleEvent.end?.dateTime || googleEvent.start.dateTime);
        const pad = (n: number) => n.toString().padStart(2, "0");
        const toFloating = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
        return {
            startTime: toFloating(startDt),
            endTime: toFloating(endDt),
            isAllDay: false
        };
    }
    if (!googleEvent.start?.date) throw new Error("Google event missing time information");
    
    const startDate = googleEvent.start.date;
    const endDate = googleEvent.end?.date || startDate;
    return { startTime: `${startDate}T00:00:00`, endTime: `${endDate}T00:00:00`, isAllDay: true }; 
}

function getEventId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    if (priv?.taskrootEventId) return priv.taskrootEventId;
    if (!googleEvent.id) throw new Error("Google event missing ID");
    return googleEvent.id;
}

function getEventTaskId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    if (priv?.taskId) return priv.taskId;
    return undefined;
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const taskId = getEventTaskId(googleEvent);
    const id = getEventId(googleEvent);
    const defaultType = googleEvent.transparency === "transparent" ? "info" : "busy";
    const type = googleEvent.extendedProperties?.private?.type || (taskId ? "plan" : defaultType);
    return { taskId, id, type };
}

function parseRecurrenceRule(recurrence?: string[]): string | undefined {
    if (!recurrence) return undefined;
    const r = recurrence.find((ruleStr) => ruleStr.startsWith("RRULE:"));
    if (r) return r.replace(/^RRULE:/i, "");
    return undefined;
}
