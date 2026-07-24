import { storeRegistry } from "../store/storeRegistry";
import { syncState } from "./SyncState";
import { TaskSynchronizer } from "./engine/TaskSynchronizer";
import { EventSynchronizer } from "./engine/EventSynchronizer";
import { Pusher } from "./engine/Pusher";
import { Poller } from "./engine/Poller";

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

export const taskSync: TaskSynchronizer = new TaskSynchronizer(context);
export const eventSync: EventSynchronizer = new EventSynchronizer(context);

export const pusher: Pusher = new Pusher(taskSync, eventSync, getSettings);


export const poller: Poller = new Poller(taskSync, eventSync, pusher, getSettings);

export { syncState } from "./SyncState";
