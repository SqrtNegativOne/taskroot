import type { AppTask, AppEvent } from "../domain/models";
/// <reference types="gapi.client.calendar" />
/// <reference types="gapi.client.tasks" />

export interface IAuthManager {
    getToken(): string | undefined;
    refreshAccessToken(): Promise<boolean>;
}

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<gapi.client.calendar.Event[] | undefined>;
    fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string}[]>;
    createEvent(localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<{ id: string, calendarId: string }>;
    updateEvent(googleEventId: string, localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<void>;
    deleteEvent(googleEventId: string, calendarId?: string): Promise<void>;
    toLocalEvent(remoteEvent: gapi.client.calendar.Event, calendarId?: string, calendarSummary?: string): AppEvent | { id: string; _deleted: boolean; updatedAt: number; };
}

export interface ITasksAPI {
    fetchTasks(tasklistId?: string): Promise<gapi.client.tasks.Task[] | undefined>;
    createTask(localTask: AppTask, tasklistId?: string): Promise<string>;
    updateTask(googleTaskId: string, localTask: AppTask, tasklistId?: string): Promise<void>;
    deleteTask(googleTaskId: string, tasklistId?: string): Promise<void>;
    toLocalTask(remoteTask: gapi.client.tasks.Task, existingLocalTask?: AppTask | undefined): AppTask | { id: string; _deleted: boolean; updatedAt: number; };
}
