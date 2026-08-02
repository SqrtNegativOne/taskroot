import type { AppTask, AppEvent } from "../../../core/domain/models";
import { ymd } from "../../../core/store/data";
import { MS_IN_HOUR } from "../../../core/utils/date-utils";

export function sortTasksForSelection(
    pendingTasks: AppTask[],
    events: AppEvent[],
    searchQuery: string
): AppTask[] {
    const todayStr = ymd(new Date());
    const now = new Date();
    const nowMs = now.getTime();
    
    let filtered = pendingTasks;
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((t) => (t.title || "").toLowerCase().includes(q));
    }

    const safeEvents = events || [];

    return filtered.toSorted((a, b) => {
        const aEvents = safeEvents.filter(
            (e) => e.taskId === a.id && (e.startTime.startsWith(todayStr) || e.endTime.startsWith(todayStr))
        );
        const bEvents = safeEvents.filter(
            (e) => e.taskId === b.id && (e.startTime.startsWith(todayStr) || e.endTime.startsWith(todayStr))
        );

        const aThisHour = aEvents.some(
            (e) => {
                const s = new Date(e.startTime).getTime();
                const en = new Date(e.endTime).getTime();
                return s <= nowMs && (en >= nowMs || s + MS_IN_HOUR >= nowMs);
            }
        );
        const bThisHour = bEvents.some(
            (e) => {
                const s = new Date(e.startTime).getTime();
                const en = new Date(e.endTime).getTime();
                return s <= nowMs && (en >= nowMs || s + MS_IN_HOUR >= nowMs);
            }
        );

        if (aThisHour !== bThisHour) return aThisHour ? -1 : 1;

        const aToday = aEvents.length > 0 || a.due === todayStr;
        const bToday = bEvents.length > 0 || b.due === todayStr;

        if (aToday !== bToday) return aToday ? -1 : 1;

        return (a.title || "").localeCompare(b.title || "");
    });
}
