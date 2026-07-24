import type { HydratedEvent } from "../../core/domain/events";
import type { AppFilter } from "../../core/domain/models";

export function filterAndSortEvents(
    todayEvents: HydratedEvent[],
    filter?: AppFilter[],
    sort?: string
): HydratedEvent[] {
    let filtered = todayEvents;

    if (filter && Array.isArray(filter) && filter.length > 0) {
        for (const f of filter) {
            if (!f.column || !f.value) continue;
            filtered = filtered.filter((e) => {
                let match = false;
                if (f.column === "type") {
                    match = e.type === f.value;
                } else if (f.column === "tag") {
                    const taskTags = (e.task ? e.task.tags : []) || [];
                    const allTags = taskTags.map((t) =>
                        typeof t === "string" ? t.toLowerCase() : "",
                    );
                    match = allTags.includes(String(f.value).toLowerCase());
                } else if (f.column === "taskStatus") {
                    if (f.value === "none") {
                        match = !e.task;
                    } else if (f.value === "done") {
                        match = e.task ? e.task.status === "done" : e.isDone;
                    } else if (f.value === "todo") {
                        match = e.task ? e.task.status !== "done" : !e.isDone;
                    }
                } else if (f.column === "category") {
                    match = (e.category || "") === f.value;
                }
                return f.operator === "is not" ? !match : match;
            });
        }
    }

    filtered.sort((a, b) => {
        if (sort === "taskStatus") {
            const aDone = a.task
                ? a.task.status === "done"
                    ? 1
                    : 0
                : a.isDone
                  ? 1
                  : 0;
            const bDone = b.task
                ? b.task.status === "done"
                    ? 1
                    : 0
                : b.isDone
                  ? 1
                  : 0;
            if (aDone !== bDone) return aDone - bDone;
        }
        return (a.start || 0) - (b.start || 0); // fallback to time
    });

    return filtered;
}
