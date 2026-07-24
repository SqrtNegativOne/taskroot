import type { AppTask, AppEvent } from "../../domain/models";

export const SyncType = {
    Task: "task",
    Event: "event"
} as const;
export type SyncType = (typeof SyncType)[keyof typeof SyncType];

export const SyncAction = {
    Create: "create",
    Update: "update",
    Delete: "delete"
} as const;
export type SyncAction = (typeof SyncAction)[keyof typeof SyncAction];

export type SyncQueueItem = 
    | {
          type: typeof SyncType.Task;
          action: SyncAction;
          item: AppTask;
          id?: string;
          calendarId?: never;
      }
    | {
          type: typeof SyncType.Event;
          action: SyncAction;
          item: AppEvent;
          id?: string;
          calendarId?: string;
      };

export interface ISyncEngineContext {
    getLocalData: <T = unknown>(key: string) => T;
    setLocalData: <T = unknown>(key: string, data: T) => void;
    prevTasksMap: Map<string, AppTask>;
    prevEventsMap: Map<string, AppEvent>;
    updatePrevTasksMap: (tasks: AppTask[]) => void;
    updatePrevEventsMap: (events: AppEvent[]) => void;
    getSettings: () => Record<string, unknown>;
    pushQueue: import('./SyncQueue').SyncQueue;
    notifyError: (msg: string) => void;
    updateStatus: (problem?: boolean, isSyncing?: boolean) => void;
}
