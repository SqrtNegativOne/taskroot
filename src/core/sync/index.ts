import { storeRegistry } from "../store/storeRegistry";
import { syncState } from "./SyncState";
import { TaskSynchronizer } from "./engine/TaskSynchronizer";
import { EventSynchronizer } from "./engine/EventSynchronizer";
import { Pusher } from "./engine/Pusher";
import { Poller } from "./engine/Poller";

const prevTasksMap = new Map<string, any>();
const prevEventsMap = new Map<string, any>();

function getSettings() {
    return storeRegistry.getLocalData("settings") || { enableCalendarSync: true, enableTasksSync: true };
}

const context = {
    getLocalData: storeRegistry.getLocalData,
    setLocalData: storeRegistry.setLocalData,
    prevTasksMap,
    prevEventsMap,
    updatePrevTasksMap: (tasks: any[]) => {
        prevTasksMap.clear();
        for (const t of tasks) prevTasksMap.set(t.id, { ...t });
    },
    updatePrevEventsMap: (events: any[]) => {
        prevEventsMap.clear();
        for (const e of events) prevEventsMap.set(e.id, { ...e });
    },
    getSettings,
    pushQueue: null as any, // will be set
    notifyError: (msg: string) => { syncState.error = msg; },
    updateStatus: () => {}, // SyncState derives this now
};

export const taskSync = new TaskSynchronizer(context);
export const eventSync = new EventSynchronizer(context);

export const pusher = new Pusher(taskSync, eventSync, getSettings);
context.pushQueue = pusher.queue; // Fix up the context

export const poller = new Poller(taskSync, eventSync, pusher, getSettings);

export { syncState } from "./SyncState";
