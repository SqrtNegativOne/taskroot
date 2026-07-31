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
            if (!currentTask.googleId && currentTask.title && currentTask.title.trim() !== "") {
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
                actions.push({
                    type: SyncType.Task,
                    action: SyncAction.Update,
                    item: currentTask,
                    googleId: currentTask.googleId,
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
                googleId: oldTask.googleId,
            });
        }
    }

    return actions;
}
