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

export interface SyncQueueItem {
    type: SyncType;
    action: SyncAction;
    item: any;
    id?: string;
    calendarId?: string;
}

export interface ISyncEngineContext {
    getLocalData: (key: string) => any;
    setLocalData: (key: string, data: any) => void;
    prevTasksMap: Map<string, any>;
    prevEventsMap: Map<string, any>;
    updatePrevTasksMap: (tasks: any[]) => void;
    updatePrevEventsMap: (events: any[]) => void;
    getSettings: () => any;
    pushQueue: import('./SyncQueue').SyncQueue;
    notifyError: (msg: string) => void;
    updateStatus: (problem?: boolean, isSyncing?: boolean) => void;
}
