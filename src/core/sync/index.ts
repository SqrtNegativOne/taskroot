import { storeRegistry } from "../store/storeRegistry";
import { syncState } from "./SyncState";
import { TaskSynchronizer } from "./engine/TaskSynchronizer";
import { EventSynchronizer } from "./engine/EventSynchronizer";
import { Pusher } from "./engine/Pusher";
import { Poller } from "./engine/Poller";

import { GoogleAuthManager } from "../auth/TokenBouncer";
import { GoogleCalendarAPI } from "./GoogleCalendarAPI";
import { GoogleTasksAPI } from "./GoogleTasksAPI";

const prevTasksMap = new Map<string, import('../domain/models').AppTask>();
const prevEventsMap = new Map<string, import('../domain/models').AppEvent>();

function getSettings() {
    return storeRegistry.getLocalData("settings") || { enableCalendarSync: true, enableTasksSync: true };
}

const context = {
    getLocalData: storeRegistry.getLocalData,
    setLocalData: storeRegistry.setLocalData,
    prevTasksMap,
    prevEventsMap,
    updatePrevTasksMap: (tasks: import('../domain/models').AppTask[]) => {
        prevTasksMap.clear();
        for (const t of tasks) prevTasksMap.set(t.id, { ...t });
    },
    updatePrevEventsMap: (events: import('../domain/models').AppEvent[]) => {
        prevEventsMap.clear();
        for (const e of events) prevEventsMap.set(e.id, { ...e });
    },
    getSettings,
    get pushQueue(): import('./engine/SyncQueue').SyncQueue { return pusher.queue; },
    notifyError: (msg: string) => { syncState.error = msg; },
    updateStatus: () => {}, // SyncState derives this now
};

const googleAuth = new GoogleAuthManager();
export const calendarApi = new GoogleCalendarAPI(googleAuth);
export const tasksApi = new GoogleTasksAPI(googleAuth);

export const taskSync: TaskSynchronizer = new TaskSynchronizer(context, tasksApi);
export const eventSync: EventSynchronizer = new EventSynchronizer(context, calendarApi);

export const pusher: Pusher = new Pusher(taskSync, eventSync, getSettings);

const hasAuth = () => !!googleAuth.getToken() || !!localStorage.getItem("google_refresh_token");
export const poller: Poller = new Poller(taskSync, eventSync, pusher, getSettings, hasAuth);

window.addEventListener("storage", (e) => {
    if (e.key === "google_access_token") {
        poller.forceSync();
    }
});

export { syncState } from "./SyncState";
