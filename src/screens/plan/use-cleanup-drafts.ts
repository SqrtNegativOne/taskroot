import React from "react";
import type { AppTask, AppEvent } from "../../core/domain/models";

export function useCleanupDrafts(
    tasks: AppTask[],
    setTasks: (tasks: AppTask[]) => void,
    setEvents: (updater: (es: AppEvent[]) => AppEvent[]) => void
) {
    React.useEffect(() => {
        const validTasks = tasks.filter(
            (t) => t.isDraft || (t.title && t.title.trim() !== ""),
        );
        if (validTasks.length !== tasks.length) {
            setTasks(validTasks);
            setEvents((es: AppEvent[]) =>
                es.filter((e: AppEvent) => {
                    if (e.taskId)
                        return validTasks.some((t: AppTask) => t.id === e.taskId);
                    return e.isDraft || (e.title && e.title.trim() !== "");
                }),
            );
        }
    }, [setTasks, setEvents, tasks]);
}
