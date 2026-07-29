import type { HydratedEvent } from "./events";
import type { AppFilter } from "./models";

export const DRAG_THRESHOLD_PX = 4;
export const MAX_RETRIES = 3;


function processFilters(filters: AppFilter[]) {
    const req: Record<string, Set<string | number>> = {};
    const excl: Record<string, Set<string | number>> = {};
    for (const f of filters) {
        if (!f.column || (!f.value && f.value !== 0)) continue;
        const values = Array.isArray(f.value) ? f.value : [f.value];
        if (values.length === 0) continue;
        
        if (f.operator === "is not") {
            if (!excl[f.column]) excl[f.column] = new Set();
            values.forEach(v => excl[f.column].add(v));
        } else {
            if (!req[f.column]) req[f.column] = new Set();
            values.forEach(v => req[f.column].add(v));
        }
    }
    return { req, excl };
}

function processSingleValueCols(
    req: Record<string, Set<string | number>>,
    excl: Record<string, Set<string | number>>,
    defaults: Record<string, unknown>
) {
    const FALLBACKS: Record<string, (string | number)[]> = {
        status: ["todo", "next-up", "doing", "done"],
        priority: [1, 2, MAX_RETRIES, DRAG_THRESHOLD_PX, 0],
    };
    const singleValueCols = ["status", "priority"];
    for (const col of singleValueCols) {
        if (req[col]) {
            if (req[col].size === 1) {
                const val = Array.from(req[col])[0];
                if (!excl[col] || !excl[col].has(val)) {
                    defaults[col] = val;
                }
            }
        } else if (excl[col] && FALLBACKS[col]) {
            for (const fallback of FALLBACKS[col]) {
                if (!excl[col].has(fallback)) {
                    defaults[col] = fallback;
                    break;
                }
            }
        }
    }
}

export function computeFilterDefaults(filters: AppFilter[] = []) {
    const { req, excl } = processFilters(filters);
    const defaults: Record<string, unknown> = {};

    processSingleValueCols(req, excl, defaults);

    if (req["tag"]) {
        const validTags = Array.from(req["tag"]).filter(
            (t) => !excl["tag"] || !excl["tag"].has(t),
        );
        if (validTags.length > 0) {
            defaults.tags = validTags;
        }
    }

    return defaults;
}

export function filterEvents(
    evs: HydratedEvent[],
    filter?: AppFilter[]
): HydratedEvent[] {
    if (!filter || !Array.isArray(filter) || filter.length === 0) return evs;
    
    let filtered = evs;
    for (const f of filter) {
        if (!f.column || (!f.value && f.value !== 0)) continue;
        filtered = filtered.filter((e) => {
            let match = false;
            const values = Array.isArray(f.value) ? f.value : [f.value];
            if (values.length === 0) return true;

            if (f.column === "type") {
                match = values.includes(e.type);
            } else if (f.column === "tag") {
                const eventTags = e.tags || [];
                const taskTags = e.task && e.task.tags ? e.task.tags : [];
                const allTags = new Set([...eventTags, ...taskTags].map((t) =>
                    typeof t === "string" ? t.toLowerCase() : "",
                ));
                match = values.some(v => allTags.has(String(v).toLowerCase()));
            } else if (f.column === "taskStatus") {
                match = values.some(v => {
                    if (v === "none") return !e.task;
                    if (v === "done") return e.task ? e.task.status === "done" : e.isDone;
                    if (v === "todo") return e.task ? e.task.status !== "done" : !e.isDone;
                    return false;
                });
            } else if (f.column === "category") {
                match = values.includes(e.category || "");
            }
            return f.operator === "is not" ? !match : match;
        });
    }
    return filtered;
}

export function sortEvents(evs: HydratedEvent[], sort?: string): HydratedEvent[] {
    if (!sort) return evs;
    const sorted = [...evs];
    sorted.sort((a, b) => {
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
        return (a.start || 0) - (b.start || 0);
    });
    return sorted;
}
