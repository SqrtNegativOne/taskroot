import type { AppTask, AppEvent } from "../../core/domain/models";
import { MINUTES_IN_HOUR } from "../../core/utils/constants";

export function minToTime(m: number): string {
    if (typeof m !== "number" || isNaN(m)) return "";
    const hh = String(Math.floor(m / MINUTES_IN_HOUR)).padStart(2, "0");
    const mm = String(m % MINUTES_IN_HOUR).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function timeToMin(t: string): number {
    if (!t) return 0;
    const [hh, mm] = t.split(":");
    return parseInt(hh || "0", 10) * MINUTES_IN_HOUR + parseInt(mm || "0", 10);
}

export function getInspectorTitle(currentTask: AppTask | undefined, currentEvent: AppEvent | undefined, tasks: AppTask[]): string {
    if (currentTask) return currentTask.title || "";
    if (currentEvent) {
        if (currentEvent.taskId) {
            return tasks.find((t: AppTask) => t.id === currentEvent.taskId)?.title || "";
        }
        return currentEvent.title || "";
    }
    return "";
}

