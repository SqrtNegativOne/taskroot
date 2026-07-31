import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import type { AppTask, AppEvent } from "../../../core/domain/models";
import { ymd } from "../../../core/store/data";

export function sortTasksForSelection(
    pendingTasks: AppTask[],
    events: AppEvent[],
    searchQuery: string
): AppTask[] {
    const todayStr = ymd(new Date());
    const now = new Date();
    const nowMin = now.getHours() * MINUTES_IN_HOUR + now.getMinutes();

    let filtered = pendingTasks;
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((t) => (t.title || "").toLowerCase().includes(q));
    }

    const safeEvents = events || [];

    return filtered.toSorted((a, b) => {
        const aEvents = safeEvents.filter(
            (e) => e.taskId === a.id && (e.date === todayStr || e.endDate === todayStr)
        );
        const bEvents = safeEvents.filter(
            (e) => e.taskId === b.id && (e.date === todayStr || e.endDate === todayStr)
        );

        const aThisHour = aEvents.some(
            (e) =>
                (e.start || 0) <= nowMin &&
                ((e.end || 0) >= nowMin || (e.start || 0) + MINUTES_IN_HOUR >= nowMin)
        );
        const bThisHour = bEvents.some(
            (e) =>
                (e.start || 0) <= nowMin &&
                ((e.end || 0) >= nowMin || (e.start || 0) + MINUTES_IN_HOUR >= nowMin)
        );

        if (aThisHour !== bThisHour) return aThisHour ? -1 : 1;

        const aToday = aEvents.length > 0 || a.due === todayStr;
        const bToday = bEvents.length > 0 || b.due === todayStr;

        if (aToday !== bToday) return aToday ? -1 : 1;

        return (a.title || "").localeCompare(b.title || "");
    });
}
