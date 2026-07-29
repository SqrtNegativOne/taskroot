import { AbstractSynchronizer } from "./AbstractSynchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ITasksAPI } from "../api-interfaces";
import type { AppTask } from "../../domain/models";
import { resolveConflict } from "./conflict-resolver";
import { computeTaskDeltaActions } from "./task-differ";

export class TaskSynchronizer extends AbstractSynchronizer<AppTask> {
    private tasksAPI: ITasksAPI;

    constructor(context: ISyncEngineContext, tasksAPI: ITasksAPI) {
        super(context);
        this.tasksAPI = tasksAPI;
    }

    // Maintained for backward compatibility with Poller
    pollTasks() {
        return this.poll();
    }

    protected isSyncEnabled(): boolean {
        return this.context.getSettings().enableTasksSync !== false;
    }

    protected getLocalStoreKey(): string {
        return "tasks";
    }

    protected updatePrevMapSnapshot(items: AppTask[]): void {
        this.context.updatePrevTasksMap(items);
    }

    protected async fetchRemoteItems(): Promise<any[] | undefined> {
        return await this.tasksAPI.fetchTasks();
    }

    protected processSingleRemoteItem(
        remote: gapi.client.tasks.Task,
        _localItemsArray: AppTask[],
        localItemsMap: Map<string, AppTask>
    ): boolean {
        let localId: string | undefined = undefined;
        const match = (remote.notes || "").match(
            /Taskroot Task ID: (t[0-9a-zA-Z-]+)/,
        );
        if (match) {
            localId = match[1];
        } else {
            for (const t of Array.from(localItemsMap.values())) {
                if (t.googleTaskId === remote.id) {
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

    protected processQueueItem(q: SyncQueueItem, tasksMap: Map<string, AppTask>): boolean {
        if (q.type !== SyncType.Task) return false;
        let updated = false;

        if (q.action === SyncAction.Delete) {
            if (q.item && q.item.id) tasksMap.delete(q.item.id);
            if (q.id) {
                for (const [key, task] of Array.from(tasksMap.entries())) {
                    if (task.googleTaskId === q.id) {
                        tasksMap.delete(key);
                    }
                }
            }
            updated = true;
        } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create) && q.item && q.item.id) {
            tasksMap.set(q.item.id, q.item);
            updated = true;
        }
        return updated;
    }

    computeDelta(newTasks: AppTask[]) {
        this.computeTasksDelta(newTasks);
    }

    computeTasksDelta(newTasks: AppTask[]) {
        const actions = computeTaskDeltaActions(newTasks, this.context.prevTasksMap);
        for (const action of actions) {
            this.context.pushQueue.push(action);
        }
        this.context.updatePrevTasksMap(newTasks);
    }

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Task) return;
        if (taskOrEvent.action === SyncAction.Create) {
            const gid = await this.tasksAPI.createTask(
                taskOrEvent.item,
            );
            if (gid) {
                const tasks = this.context.getLocalData<AppTask[]>("tasks");
                const idx = tasks.findIndex(
                    (t) => t.id === taskOrEvent.item.id,
                );
                if (idx !== -1) {
                    tasks[idx] = {
                        ...tasks[idx],
                        googleTaskId: gid,
                    };
                    this.context.setLocalData("tasks", tasks);
                    this.context.updatePrevTasksMap(tasks);
                }
            }
        } else if (
            taskOrEvent.action === SyncAction.Update &&
            taskOrEvent.id
        ) {
            await this.tasksAPI.updateTask(
                taskOrEvent.id,
                taskOrEvent.item,
            );
        } else if (
            taskOrEvent.action === SyncAction.Delete &&
            taskOrEvent.id
        ) {
            await this.tasksAPI.deleteTask(taskOrEvent.id);
        }
    }
}
