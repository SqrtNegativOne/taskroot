import type { AppEvent } from "../../domain/models";
import { ResultAsync } from "neverthrow";
import type { SyncError } from "../errors";
/// <reference types="gapi.client.calendar" />

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): ResultAsync<gapi.client.calendar.Event[] | undefined, SyncError>;
    fetchCalendars(): ResultAsync<{id: string, summary: string, accessRole?: string, backgroundColor?: string, foregroundColor?: string, primary?: boolean}[], SyncError>;
    createEvent(localEvent: AppEvent, options?: { baseEventRemoteId?: string, calendarId?: string }): ResultAsync<{ remoteId: string, calendarId: string }, SyncError>;
    updateEvent(remoteId: string, localEvent: AppEvent, options?: { updatedFields?: (keyof AppEvent)[], baseEventRemoteId?: string, calendarId?: string }): ResultAsync<void, SyncError>;
    moveEvent(remoteId: string, sourceCalendarId: string, destinationCalendarId: string): ResultAsync<void, SyncError>;
    deleteEvent(remoteId: string, options?: { calendarId?: string }): ResultAsync<void, SyncError>;
    toLocalEvent(remoteEvent: gapi.client.calendar.Event, calendarId?: string): AppEvent | { id: string; _deleted: boolean; updatedAt: number; };
}
