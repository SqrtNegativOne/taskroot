import { storeRegistry } from "../store/storeRegistry";
import { repos } from "../store/repositories";
import { syncState } from "./SyncState";
import { Synchronizer } from "./engine/Synchronizer";
import { TaskSyncStrategy } from "./engine/TaskSyncStrategy";
import { EventSyncStrategy } from "./engine/EventSyncStrategy";
import { Pusher } from "./engine/Pusher";
import { Poller } from "./engine/Poller";

import { GoogleAuthManager } from "./auth/TokenBouncer";
import { GoogleCalendarAPI } from "./calendar-api/GoogleCalendarAPI";
import { GoogleTasksAPI } from "./task-api/GoogleTasksAPI";
import type { AppTask, AppEvent } from "../domain/models";

const oldTasksMap = new Map<string, AppTask>();
const oldEventsMap = new Map<string, AppEvent>();

import type { AppSettings } from "../store/settingsSchema";

function getSettings(): AppSettings {
    const res = storeRegistry.getLocalData<AppSettings>("settings");
    return res.isOk() && res.value !== undefined ? res.value : repos.settings.initial;
}

const context = {
    oldTasksMap,
    oldEventsMap,
    updateOldTasksMap: (tasks: AppTask[]) => {
        oldTasksMap.clear();
        for (const t of tasks) oldTasksMap.set(t.id, { ...t });
    },
    updateOldEventsMap: (events: AppEvent[]) => {
        oldEventsMap.clear();
        for (const e of events) oldEventsMap.set(e.id, { ...e });
    },
    getSettings,
    get pushQueue(): import('./engine/SyncQueue').SyncQueue { return pusher.queue; },
    notifyError: (msg: string) => { syncState.error = msg; },
    updateStatus: () => {}, // SyncState derives this now
};

const googleAuth = new GoogleAuthManager();
export const calendarApi = new GoogleCalendarAPI(googleAuth);
export const tasksApi = new GoogleTasksAPI(googleAuth);

const taskStrategy = new TaskSyncStrategy(context, tasksApi);
export const taskSync = new Synchronizer<AppTask>(context, taskStrategy);

const eventStrategy = new EventSyncStrategy(context, calendarApi);
export const eventSync = new Synchronizer<AppEvent>(context, eventStrategy);

export const pusher: Pusher = new Pusher(taskSync, eventSync);

repos.tasks.subscribe((next, _prev, source) => {
    if (source === "local") {
        taskSync.computeDelta(next);
        pusher.trigger();
    }
});

repos.events.subscribe((next, _prev, source) => {
    if (source === "local") {
        eventSync.computeDelta(next);
        pusher.trigger();
    }
});

const hasAuth = () => !!googleAuth.getToken() || !!localStorage.getItem("google_refresh_token");
export const poller: Poller = new Poller(taskSync, eventSync, pusher, { getSettings, hasAuth });

window.addEventListener("storage", (e) => {
    if (e.key === "google_access_token") {
        poller.forceSync();
    }
});

export { syncState } from "./SyncState";
