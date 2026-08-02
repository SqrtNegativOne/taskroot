import type { AppTask, AppEvent } from "../../domain/models";
/// <reference types="gapi.client.calendar" />

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<gapi.client.calendar.Event[] | undefined>;
    fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]>;
    createEvent(localEvent: AppEvent, ctx: { tasks: AppTask[], events: AppEvent[] }, calendarId?: string): Promise<{ googleId: string, calendarId: string }>;
    updateEvent(googleId: string, localEvent: AppEvent, ctx: { tasks: AppTask[], events: AppEvent[] }, calendarId?: string): Promise<void>;
    moveEvent(googleId: string, sourceCalendarId: string, destinationCalendarId: string): Promise<void>;
    deleteEvent(googleId: string, calendarId?: string): Promise<void>;
    toLocalEvent(remoteEvent: gapi.client.calendar.Event, calendarId?: string, calendarSummary?: string): AppEvent | { id: string; _deleted: boolean; updatedAt: number; };
}
