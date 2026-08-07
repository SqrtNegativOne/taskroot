import type { SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { AppTask } from "../../domain/models";

function processSingleTaskDelta(
    currentTask: AppTask,
    oldTask: AppTask | undefined,
    actions: SyncQueueItem[]
) {
    if (!oldTask) {
        const isValid = !currentTask.remoteId && currentTask.title && currentTask.title.trim() !== "";
        if (isValid) {
            actions.push({
                type: SyncType.Task,
                action: SyncAction.Create,
                item: currentTask,
            });
        }
        return;
    }

    const update = currentTask.updatedAt && oldTask.updatedAt && currentTask.updatedAt > oldTask.updatedAt;
    if (!update) return;

    const isValid = currentTask.title && currentTask.title.trim() !== "";
    if (!isValid) return;

    const updatedFields: (keyof AppTask)[] = [];
    // Object.keys returns string[], we know this is (keyof AppTask)[]
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
        ...(currentTask.remoteId !== undefined ? { remoteId: currentTask.remoteId } : {}),
        updatedFields,
    });
}

export function computeTaskDeltaActions(
    currentTasks: AppTask[],
    oldTasksMap: Map<string, AppTask>
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const currentTasksMap = new Map(currentTasks.map((t) => [t.id, t]));

    for (const currentTask of currentTasks)
        processSingleTaskDelta(currentTask, oldTasksMap.get(currentTask.id), actions);

    for (const [id, oldTask] of oldTasksMap.entries()) {
        if (!currentTasksMap.has(id)) {
            actions.push({
                type: SyncType.Task,
                action: SyncAction.Delete,
                item: oldTask,
                ...(oldTask.remoteId !== undefined ? { remoteId: oldTask.remoteId } : {}),
            });
        }
    }

    return actions;
}
