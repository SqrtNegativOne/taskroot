import type { AppTask, AppEvent } from "../domain/models";

export interface IAuthManager {
    getToken(): string | null;
    refreshAccessToken(): Promise<boolean>;
}

export interface ICalendarAPI {
    fetchEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<any>;
    fetchCalendars(): Promise<{id: string, summary: string, accessRole?: string}[]>;
    createEvent(localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<{ id: string, calendarId: string }>;
    updateEvent(googleEventId: string, localEvent: AppEvent, tasks: AppTask[], calendarId?: string): Promise<void>;
    deleteEvent(googleEventId: string, calendarId?: string): Promise<void>;
    toLocalEvent(remoteEvent: any, calendarId?: string, calendarSummary?: string): any;
}

export interface ITasksAPI {
    fetchTasks(tasklistId?: string): Promise<any>;
    createTask(localTask: AppTask, tasklistId?: string): Promise<string>;
    updateTask(googleTaskId: string, localTask: AppTask, tasklistId?: string): Promise<void>;
    deleteTask(googleTaskId: string, tasklistId?: string): Promise<void>;
    toLocalTask(remoteTask: any, existingLocalTask?: AppTask | null): any;
}
