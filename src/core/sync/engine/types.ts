import type { AppTask, AppEvent } from "../../domain/models";
import type { AppSettings } from "../../store/settingsSchema";

export const SyncType = {
    Task: "task",
    Event: "event"
} as const;
export type SyncType = (typeof SyncType)[keyof typeof SyncType];

export const SyncAction = {
    Create: "create",
    Update: "update",
    Delete: "delete",
    Move: "move"
} as const;
export type SyncAction = (typeof SyncAction)[keyof typeof SyncAction];

export type SyncQueueItem = 
    | {
          type: typeof SyncType.Task;
          action: SyncAction;
          item: AppTask;
          remoteId?: string;
          calendarId?: never;
          updatedFields?: (keyof AppTask)[];
      }
    | {
          type: typeof SyncType.Event;
          action: SyncAction;
          item: AppEvent;
          remoteId?: string;
          calendarId?: string;
          destinationCalendarId?: string;
          updatedFields?: (keyof AppEvent)[];
      };

export interface ISyncQueue {
    push(item: SyncQueueItem): void;
    shift(): SyncQueueItem | undefined;
    remove(item: SyncQueueItem): void;
    peek(): SyncQueueItem | undefined;
    readonly length: number;
    getItems(): SyncQueueItem[];
    clear(): void;
}

export interface ISyncEngineContext {
    oldTasksMap: Map<string, AppTask>;
    oldEventsMap: Map<string, AppEvent>;
    updateOldTasksMap: (tasks: AppTask[]) => void;
    updateOldEventsMap: (events: AppEvent[]) => void;
    getSettings: () => AppSettings;
    pushQueue: ISyncQueue;
    notifyError: (msg: string) => void;
    updateStatus: (problem?: boolean, isSyncing?: boolean) => void;
}
