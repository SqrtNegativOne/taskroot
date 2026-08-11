import type { ISyncStrategy } from "./Synchronizer";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { ITasksAPI } from "../task-api/types";
import type { AppTask } from "../../domain/models";
import { repos } from "../../store/repositories";
import { resolveConflict } from "./conflict-resolver";
import { computeTaskDeltaActions } from "./task-differ";
import { ResultAsync, okAsync } from "neverthrow";
import { toSyncError, type SyncError } from "../errors";

export class TaskSyncStrategy implements ISyncStrategy<AppTask> {
    private context: ISyncEngineContext;
    private tasksAPI: ITasksAPI;

    constructor(context: ISyncEngineContext, tasksAPI: ITasksAPI) {
        this.context = context;
        this.tasksAPI = tasksAPI;
    }

    isSyncEnabled(): boolean {
        return this.context.getSettings().enableTasksSync ?? true;
    }

    getLocalItems(): AppTask[] {
        return repos.tasks.get().unwrapOr(repos.tasks.initial);
    }

    setLocalItems(items: AppTask[]): void {
        repos.tasks.setFromRemote(items);
    }

    getSyncType(): SyncType {
        return SyncType.Task;
    }

    extractItem(q: SyncQueueItem): AppTask | undefined {
        return q.type === SyncType.Task ? q.item : undefined;
    }

    updateOldMapSnapshot(items: AppTask[]): void {
        this.context.updateOldTasksMap(items);
    }

    fetchRemoteItems(): ResultAsync<unknown[] | undefined, SyncError> {
        return this.tasksAPI.fetchTasks();
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
            const gidResult = await this.tasksAPI.createTask(taskOrEvent.item);
            if (gidResult.isErr()) throw gidResult.error;
            const gid = gidResult.value;
            if (gid) {
                const tasks = repos.tasks.get().unwrapOr(repos.tasks.initial);
                const idx = tasks.findIndex((t) => t.id === taskOrEvent.item.id);
                const t = tasks[idx];
                if (idx !== -1 && t) {
                    const updated = [...tasks];
                    updated[idx] = { ...t, remoteId: gid };
                    repos.tasks.setFromRemote(updated);
                    this.context.updateOldTasksMap(updated);
                } else {
                    const deleteResult = await this.tasksAPI.deleteTask(gid);
                    if (deleteResult.isErr()) throw deleteResult.error;
                }
            }
        },
        [SyncAction.Update]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Task) return;
            const tasks = repos.tasks.get().unwrapOr(repos.tasks.initial);
            const currentTask = tasks.find((t) => t.id === taskOrEvent.item.id);
            const gid = currentTask?.remoteId || taskOrEvent.remoteId;

            if (gid) {
                const updateResult = await this.tasksAPI.updateTask(gid, taskOrEvent.item, taskOrEvent.updatedFields);
                if (updateResult.isErr()) throw updateResult.error;
            }
        },
        [SyncAction.Delete]: async (taskOrEvent) => {
            if (taskOrEvent.type !== SyncType.Task) return;
            // If the item doesn't exist locally, tasks.find will be undefined.
            // If deleted locally, we rely on taskOrEvent.remoteId from the queue.
            const gid = taskOrEvent.remoteId;
            
            if (gid) {
                const deleteResult = await this.tasksAPI.deleteTask(gid);
                if (deleteResult.isErr()) throw deleteResult.error;
            }
        }
    };

    processPushItem(taskOrEvent: SyncQueueItem): ResultAsync<void, SyncError> {
        if (taskOrEvent.type !== SyncType.Task) return okAsync(undefined);
        const handler = this.actionHandlers[taskOrEvent.action];
        if (handler) {
            return ResultAsync.fromPromise(
                handler(taskOrEvent),
                e => toSyncError(e)
            );
        }
        return okAsync(undefined);
    }
}
