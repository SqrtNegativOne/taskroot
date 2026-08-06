import type { SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { AppTask } from "../../domain/models";

export function computeTaskDeltaActions(
    currentTasks: AppTask[],
    oldTasksMap: Map<string, AppTask>
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const currentTasksMap = new Map(currentTasks.map((t) => [t.id, t]));

    for (const currentTask of currentTasks) {
        const oldTask = oldTasksMap.get(currentTask.id);
        if (!oldTask) {
            if (!currentTask.remoteId && currentTask.title && currentTask.title.trim() !== "") {
                actions.push({
                    type: SyncType.Task,
                    action: SyncAction.Create,
                    item: currentTask,
                });
            }
            continue;
        }

        if (
            currentTask.updatedAt &&
            oldTask.updatedAt &&
            currentTask.updatedAt > oldTask.updatedAt
        ) {
            if (currentTask.title && currentTask.title.trim() !== "") {
                const updatedFields: (keyof AppTask)[] = [];
                for (const k of Object.keys(currentTask) as (keyof AppTask)[]) {
                    if (k === "updatedAt" || k === "etag") continue;
                    if (JSON.stringify(currentTask[k]) !== JSON.stringify(oldTask[k])) {
                        updatedFields.push(k);
                    }
                }

                actions.push({
                    type: SyncType.Task,
                    action: SyncAction.Update,
                    item: currentTask,
                    remoteId: currentTask.remoteId,
                    updatedFields,
                });
            }
        }
    }

    for (const [id, oldTask] of oldTasksMap.entries()) {
        if (!currentTasksMap.has(id)) {
            actions.push({
                type: SyncType.Task,
                action: SyncAction.Delete,
                item: oldTask,
                remoteId: oldTask.remoteId,
            });
        }
    }

    return actions;
}
