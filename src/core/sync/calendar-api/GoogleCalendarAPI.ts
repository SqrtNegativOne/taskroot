import { MINUTES_IN_HOUR, HOURS_PER_DAY, MINUTES_PER_DAY, HTTP_UNAUTHORIZED } from "../../utils/constants";
import { fetchWithTimeout } from "../../store/api";
import type { AppTask, AppEvent } from "../../domain/models";
import type { IAuthManager } from "../auth/types";
import type { ICalendarAPI } from "./types";
/// <reference types="gapi.client.calendar" />

const pad = (n: number) => n.toString().padStart(2, "0");

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
            res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/${endpoint}`, getOpts(this.authManager.getToken() || ""));
        }
        return res;
    }

    async fetchEvents(timeMin: string, timeMax: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`);
        if (!res.ok) { console.warn(`Failed to fetch events for calendar ${calendarId}`); return undefined; }
        const data: { items?: gapi.client.calendar.Event[] } = await res.json();
        return data.items || [];
    }

    async fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string}[]> {
        const def = [{ id: "primary", summary: "Primary Calendar", accessRole: "owner" }];
        if (!this.authManager.getToken()) return def;
        const res = await this.fetchWithAuth("users/me/calendarList");
        if (!res.ok) { console.warn(`Failed to fetch calendars`); return def; }
        const data: { items?: {id: string, summary: string, accessRole?: string}[] } = await res.json();
        return data.items || def;
    }

    async createEvent(localEvent: AppEvent, tasks: AppTask[], calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, tasks))
        });
        if (!res.ok) throw new Error(`Failed to create event: ${res.status} ${await res.text()}`);
        const data: { id?: string } = await res.json();
        return { id: data.id || "", calendarId };
    }

    async updateEvent(googleEventId: string, localEvent: AppEvent, tasks: AppTask[], calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleEvent(localEvent, tasks))
        });
        if (!res.ok) throw new Error(`Failed to update event: ${res.status} ${await res.text()}`);
    }

    async deleteEvent(googleEventId: string, calendarId = "primary") {
        const res = await this.fetchWithAuth(`calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Failed to delete event: ${res.status} ${await res.text()}`);
    }

    toGoogleEvent(localEvent: AppEvent, tasks: AppTask[]): gapi.client.calendar.Event {
        const task = localEvent.taskId ? tasks.find((t) => t.id === localEvent.taskId) : null;
        const dtStr = (date: string, mins: number) => {
            let [y, m, d] = date.split("-").map(Number);
            if (mins >= MINUTES_PER_DAY) { d += Math.floor(mins / MINUTES_PER_DAY); mins %= MINUTES_PER_DAY; }
            const dt = new Date(y, m - 1, d);
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(Math.floor(mins / MINUTES_IN_HOUR))}:${pad(mins % MINUTES_IN_HOUR)}:00`;
        };
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return {
            summary: (task ? task.title : localEvent.title) || "Taskroot Event",
            start: { dateTime: dtStr(localEvent.date, localEvent.start), timeZone },
            end: { dateTime: dtStr(localEvent.date, localEvent.end), timeZone },
            description: localEvent.description || "",
            extendedProperties: {
                private: {
                    taskrootEventId: localEvent.id,
                    ...(localEvent.taskId ? { taskId: localEvent.taskId } : {}),
                    type: localEvent.type || "",
                },
            },
            ...(localEvent.rrule ? { recurrence: [`RRULE:${localEvent.rrule}`] } : {})
        };
    }

    toLocalEvent(googleEvent: gapi.client.calendar.Event, calendarId = "primary", calendarSummary = "") {
        if (googleEvent.status === "cancelled") {
            const privateProps = googleEvent.extendedProperties?.private;
            return {
                id: (privateProps ? privateProps.taskrootEventId : null) || googleEvent.id || "",
                _deleted: true,
                updatedAt: new Date(googleEvent.updated || 0).getTime(),
            };
        }
        const { date, start, end } = extractEventTime(googleEvent);
        const { taskId, id, type } = extractEventMetadata(googleEvent);
        const rrule = parseRecurrenceRule(googleEvent.recurrence);

        return {
            id: id || "", googleEventId: googleEvent.id, googleCalendarId: calendarId, taskId,
            title: googleEvent.summary || "Untitled Event", date: date || "", start: start || 0, end: end || 0, type,
            category: calendarSummary, rrule,
            updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now(),
        };
    }
}

function extractEventTime(googleEvent: gapi.client.calendar.Event) {
    if (googleEvent.start?.dateTime) {
        const startDt = new Date(googleEvent.start.dateTime);
        const endDt = new Date(googleEvent.end?.dateTime || googleEvent.start.dateTime);
        return {
            date: `${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}`,
            start: startDt.getHours() * MINUTES_IN_HOUR + startDt.getMinutes(),
            end: (endDt.getDate() !== startDt.getDate() && endDt.getTime() > startDt.getTime()) ? HOURS_PER_DAY * MINUTES_IN_HOUR : endDt.getHours() * MINUTES_IN_HOUR + endDt.getMinutes()
        };
    }
    return googleEvent.start?.date 
        ? { date: googleEvent.start.date, start: 0, end: HOURS_PER_DAY * MINUTES_IN_HOUR } 
        : { date: undefined, start: undefined, end: undefined };
}

function getEventId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    const desc = googleEvent.description || "";
    if (priv?.taskrootEventId) return priv.taskrootEventId;
    const match = desc.match(/Taskroot Event ID: (e[0-9a-zA-Z-]+)/);
    if (match) return match[1];
    return googleEvent.id || "";
}

function getEventTaskId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    const desc = googleEvent.description || "";
    if (priv?.taskId) return priv.taskId;
    const match = desc.match(/Task ID: (t\d+)/);
    return match ? match[1] : null;
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const taskId = getEventTaskId(googleEvent);
    const id = getEventId(googleEvent);
    const type = googleEvent.extendedProperties?.private?.type || (taskId ? "plan" : (googleEvent.start?.date ? "info" : "busy"));
    return { taskId, id, type };
}

function parseRecurrenceRule(recurrence?: string[]): string | undefined {
    if (!recurrence) return undefined;
    const r = recurrence.find((ruleStr) => ruleStr.startsWith("RRULE:"));
    if (r) return r.replace(/^RRULE:/i, "");
    return undefined;
}
