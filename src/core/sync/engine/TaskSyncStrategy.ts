import type { ISyncStrategy } from "./Synchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ITasksAPI } from "../task-api/types";
import type { AppTask } from "../../domain/models";
import { resolveConflict } from "./conflict-resolver";
import { computeTaskDeltaActions } from "./task-differ";

export class TaskSyncStrategy implements ISyncStrategy<AppTask> {
    private context: ISyncEngineContext;
    private tasksAPI: ITasksAPI;

    constructor(context: ISyncEngineContext, tasksAPI: ITasksAPI) {
        this.context = context;
        this.tasksAPI = tasksAPI;
    }

    isSyncEnabled(): boolean {
        return this.context.getSettings().enableTasksSync !== false;
    }

    getLocalStoreKey(): string {
        return "tasks";
    }

    updateOldMapSnapshot(items: AppTask[]): void {
        this.context.updateOldTasksMap(items);
    }

    async fetchRemoteItems(): Promise<unknown[] | undefined> {
        return await this.tasksAPI.fetchTasks();
    }

    processSingleRemoteItem(
        remote: gapi.client.tasks.Task,
        _localItemsArray: AppTask[],
        localItemsMap: Map<string, AppTask>
    ): boolean {
        let localId: string | undefined = undefined;
        const match = remote.notes?.match(
            /Taskroot Task ID: (t[0-9a-zA-Z-]+)/,
        );
        if (match) {
            localId = match[1];
        } else {
            for (const t of Array.from(localItemsMap.values())) {
                if (t.remoteId === remote.id) {
                    localId = t.id;
                    break;
                }
            }
        }

        const existingLocalTask = localId ? localItemsMap.get(localId) : undefined;
        const standardizedRemote = this.tasksAPI.toLocalTask(
            remote,
            existingLocalTask,
        );

        return resolveConflict(standardizedRemote, existingLocalTask, localItemsMap);
    }

    processQueueItem(q: SyncQueueItem, tasksMap: Map<string, AppTask>): boolean {
        if (q.type !== SyncType.Task) return false;
        let updated = false;

        if (q.action === SyncAction.Delete) {
            if (q.item && q.item.id) tasksMap.delete(q.item.id);
            if (q.remoteId) {
                for (const [key, task] of Array.from(tasksMap.entries())) {
                    if (task.remoteId === q.remoteId) {
                        tasksMap.delete(key);
                    }
                }
            }
            updated = true;
        } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create) && q.item && q.item.id) {
            const existing = tasksMap.get(q.item.id);
            if (q.action === SyncAction.Update && q.updatedFields && existing) {
                const partialUpdate: Partial<AppTask> = {};
                for (const field of q.updatedFields) {
                    Object.defineProperty(partialUpdate, field, {
                        value: q.item[field],
                        enumerable: true,
                        writable: true,
                        configurable: true,
                    });
                }
                Object.defineProperty(partialUpdate, "updatedAt", {
                    value: Math.max(q.item.updatedAt || 0, existing.updatedAt || 0),
                    enumerable: true,
                    writable: true,
                    configurable: true,
                });
                tasksMap.set(q.item.id, { ...existing, ...partialUpdate });
            } else {
                tasksMap.set(q.item.id, q.item);
            }
            updated = true;
        }
        return updated;
    }

    computeDelta(currentTasks: AppTask[]) {
        const actions = computeTaskDeltaActions(currentTasks, this.context.oldTasksMap);
        for (const action of actions) {
            this.context.pushQueue.push(action);
        }
        this.context.updateOldTasksMap(currentTasks);
    }

    private actionHandlers: Record<string, (item: SyncQueueItem) => Promise<void>> = {
        [SyncAction.Create]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Task) return;
            const gid = await this.tasksAPI.createTask(taskOrEvent.item);
            if (gid) {
                const tasks = this.context.getLocalData<AppTask[]>("tasks");
                const idx = tasks.findIndex((t) => t.id === taskOrEvent.item.id);
                if (idx !== -1) {
                    tasks[idx] = { ...tasks[idx], remoteId: gid };
                    this.context.setLocalData("tasks", tasks);
                    this.context.updateOldTasksMap(tasks);
                } else {
                    await this.tasksAPI.deleteTask(gid);
                }
            }
        },
        [SyncAction.Update]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Task) return;
            const tasks = this.context.getLocalData<AppTask[]>("tasks");
            const currentTask = tasks.find((t) => t.id === taskOrEvent.item.id);
            const gid = currentTask?.remoteId || taskOrEvent.remoteId;

            if (gid) {
                await this.tasksAPI.updateTask(gid, taskOrEvent.item, taskOrEvent.updatedFields);
            }
        },
        [SyncAction.Delete]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Task) return;
            // If the item doesn't exist locally, tasks.find will be undefined.
            // If deleted locally, we rely on taskOrEvent.remoteId from the queue.
            const gid = taskOrEvent.remoteId;
            
            if (gid) {
                await this.tasksAPI.deleteTask(gid);
            }
        }
    };

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Task) return;
        const handler = this.actionHandlers[taskOrEvent.action];
        if (handler) await handler(taskOrEvent);
    }
}
