import type { AppTask, AppEvent } from "../../domain/models";
/// <reference types="gapi.client.calendar" />

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<gapi.client.calendar.Event[] | undefined>;
    fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[]>;
    createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): Promise<{ remoteId: string, calendarId: string }>;
    updateEvent(remoteId: string, localEvent: AppEvent, options?: { updatedFields?: (keyof AppEvent)[], baseEventRemoteId?: string, calendarId?: string }): Promise<void>;
    moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string): Promise<void>;
    deleteEvent(remoteId: string, calendarId?: string): Promise<void>;
    toLocalEvent(remoteEvent: gapi.client.calendar.Event, calendarId?: string): AppEvent | { id: string; _deleted: boolean; updatedAt: number; };
}
