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
        if (res.status === 401) {
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
        const pad = (n: number) => n.toString().padStart(2, "0");
        const dtStr = (date: string, mins: number) => {
            let [y, m, d] = date.split("-").map(Number);
            if (mins >= 1440) { d += Math.floor(mins / 1440); mins %= 1440; }
            const dt = new Date(y, m - 1, d);
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`;
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
            return {
                id: googleEvent.extendedProperties?.private?.taskrootEventId || googleEvent.id || "",
                _deleted: true,
                updatedAt: new Date(googleEvent.updated || 0).getTime(),
            };
        }
        const { date, start, end } = extractEventTime(googleEvent);
        const { taskId, id, type } = extractEventMetadata(googleEvent);
        const rrule = googleEvent.recurrence?.find((r) => r.startsWith("RRULE:"))?.replace(/^RRULE:/i, "");

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
        const pad = (n: number) => n.toString().padStart(2, "0");
        return {
            date: `${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}`,
            start: startDt.getHours() * 60 + startDt.getMinutes(),
            end: (endDt.getDate() !== startDt.getDate() && endDt.getTime() > startDt.getTime()) ? 24 * 60 : endDt.getHours() * 60 + endDt.getMinutes()
        };
    }
    return googleEvent.start?.date 
        ? { date: googleEvent.start.date, start: 0, end: 24 * 60 } 
        : { date: undefined, start: undefined, end: undefined };
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    const desc = googleEvent.description || "";
    const taskId = priv?.taskId || desc.match(/Task ID: (t\d+)/)?.[1] || null;
    return {
        taskId,
        id: priv?.taskrootEventId || desc.match(/Taskroot Event ID: (e[0-9a-zA-Z-]+)/)?.[1] || googleEvent.id || "",
        type: priv?.type || (taskId ? "plan" : (googleEvent.start?.date ? "info" : "busy"))
    };
}
