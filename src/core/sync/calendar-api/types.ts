import type { AppTask, AppEvent } from "../../domain/models";
/// <reference types="gapi.client.calendar" />

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<gapi.client.calendar.Event[] | undefined>;
    fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string}[]>;
    createEvent(localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<{ id: string, calendarId: string }>;
    updateEvent(googleEventId: string, localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<void>;
    deleteEvent(googleEventId: string, calendarId?: string): Promise<void>;
    toLocalEvent(remoteEvent: gapi.client.calendar.Event, calendarId?: string, calendarSummary?: string): AppEvent | { id: string; _deleted: boolean; updatedAt: number; };
}
