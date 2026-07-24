import { googleTasksAPI } from "../GoogleTasksAPI";
import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";

export class TaskSynchronizer {
    private context: ISyncEngineContext;
    constructor(context: ISyncEngineContext) {
        this.context = context;
    }

    async pollTasks() {
        const settings = this.context.getSettings();
        if (settings.enableTasksSync === false) return;

        const tasks = this.context.getLocalData<import('../../domain/models').AppTask[]>("tasks");
        this.context.updatePrevTasksMap(tasks);

        const remoteTasks = await googleTasksAPI.fetchTasks();
        if (!remoteTasks) return;

        let updated = false;
        const tasksMap = new Map<string, import('../../domain/models').AppTask>(tasks.map((t) => [t.id, t]));

        for (const remote of remoteTasks) {
            let localId = null;
            const match = (remote.notes || "").match(
                /Taskroot Task ID: (t[0-9a-zA-Z-]+)/,
            );
            if (match) {
                localId = match[1];
            } else {
                const existing = tasks.find(
                    (t) => t.googleTaskId === remote.id,
                );
                if (existing) localId = existing.id;
            }

            const existingLocalTask = localId ? tasksMap.get(localId) : null;
            const standardizedRemote = googleTasksAPI.toLocalTask(
                remote,
                existingLocalTask,
            );

            if (standardizedRemote._deleted) {
                if (existingLocalTask) {
                    const localUpdated = existingLocalTask.updatedAt || 0;
                    if (standardizedRemote.updatedAt > localUpdated) {
                        tasksMap.delete(existingLocalTask.id);
                        updated = true;
                    }
                }
                continue;
            }

            if (existingLocalTask) {
                const localUpdated = existingLocalTask.updatedAt || 0;
                const remoteUpdated = standardizedRemote.updatedAt || 0;

                if (remoteUpdated > localUpdated) {
                    tasksMap.set(existingLocalTask.id, standardizedRemote);
                    updated = true;
                }
            } else {
                tasksMap.set(standardizedRemote.id, standardizedRemote);
                updated = true;
            }
        }

        // --- Optimistic Overlay ---
        for (const q of this.context.pushQueue.getItems()) {
            if (q.type === SyncType.Task) {
                if (q.action === SyncAction.Delete) {
                    if (q.item && q.item.id) tasksMap.delete(q.item.id);
                    if (q.id) {
                        for (const [key, task] of tasksMap.entries()) {
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
            }
        }

        if (updated) {
            const newTasks = Array.from(tasksMap.values());
            this.context.setLocalData("tasks", newTasks);
            this.context.updatePrevTasksMap(newTasks);
        }
    }

    computeTasksDelta(newTasks: import('../../domain/models').AppTask[]) {
        const newTasksMap = new Map(newTasks.map((t) => [t.id, t]));

        for (const task of newTasks) {
            const prev = this.context.prevTasksMap.get(task.id);
            if (!prev) {
                if (!task.googleTaskId && !task.isDraft) {
                    this.context.pushQueue.push({
                        type: SyncType.Task,
                        action: SyncAction.Create,
                        item: task,
                    });
                }
                continue;
            }

            if (
                task.updatedAt &&
                prev.updatedAt &&
                task.updatedAt > prev.updatedAt
            ) {
                if (task.googleTaskId) {
                    this.context.pushQueue.push({
                        type: SyncType.Task,
                        action: SyncAction.Update,
                        item: task,
                        id: task.googleTaskId,
                    });
                } else if (!task.isDraft) {
                    this.context.pushQueue.push({
                        type: SyncType.Task,
                        action: SyncAction.Create,
                        item: task,
                    });
                }
            }
        }

        for (const [id, prev] of this.context.prevTasksMap.entries()) {
            if (!newTasksMap.has(id) && prev.googleTaskId) {
                this.context.pushQueue.push({
                    type: SyncType.Task,
                    action: SyncAction.Delete,
                    item: prev,
                    id: prev.googleTaskId,
                });
            }
        }

        this.context.updatePrevTasksMap(newTasks);
    }

    async processPushItem(taskOrEvent: SyncQueueItem) {
        if (taskOrEvent.type !== SyncType.Task) return;
        if (taskOrEvent.action === SyncAction.Create) {
            const gid = await googleTasksAPI.createTask(
                taskOrEvent.item,
            );
            if (gid) {
                const tasks = this.context.getLocalData<import('../../domain/models').AppTask[]>("tasks");
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
            await googleTasksAPI.updateTask(
                taskOrEvent.id,
                taskOrEvent.item,
            );
        } else if (
            taskOrEvent.action === SyncAction.Delete &&
            taskOrEvent.id
        ) {
            await googleTasksAPI.deleteTask(taskOrEvent.id);
        }
    }
}
