import type { SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import type { AppTask } from "../../domain/models";

export function computeTaskDeltaActions(
    newTasks: AppTask[],
    prevTasksMap: Map<string, AppTask>
): SyncQueueItem[] {
    const actions: SyncQueueItem[] = [];
    const newTasksMap = new Map(newTasks.map((t) => [t.id, t]));

    for (const task of newTasks) {
        const prev = prevTasksMap.get(task.id);
        if (!prev) {
            if (!task.googleTaskId && !task.isDraft) {
                actions.push({
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
                actions.push({
                    type: SyncType.Task,
                    action: SyncAction.Update,
                    item: task,
                    id: task.googleTaskId,
                });
            } else if (!task.isDraft) {
                actions.push({
                    type: SyncType.Task,
                    action: SyncAction.Create,
                    item: task,
                });
            }
        }
    }

    for (const [id, prev] of prevTasksMap.entries()) {
        if (!newTasksMap.has(id) && prev.googleTaskId) {
            actions.push({
                type: SyncType.Task,
                action: SyncAction.Delete,
                item: prev,
                id: prev.googleTaskId,
            });
        }
    }

    return actions;
}
