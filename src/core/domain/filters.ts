import type { HydratedEvent } from "./events";
import type { AppFilter } from "./models";

export const DRAG_THRESHOLD_PX = 4;
export const MAX_RETRIES = 3;


function processFilterItem(f: AppFilter, req: Record<string, Set<string | number>>, excl: Record<string, Set<string | number>>) {
    if (!f.column) return;
    if (f.value === undefined || f.value === null || f.value === "") return;
    
    const values = Array.isArray(f.value) ? f.value : [f.value];
    if (values.length === 0) return;
    
    if (f.operator === "is not") {
        const colSet = excl[f.column] || new Set();
        excl[f.column] = colSet;
        for (const v of values) colSet.add(v);
    } else {
        const colSet = req[f.column] || new Set();
        req[f.column] = colSet;
        for (const v of values) colSet.add(v);
    }
}

function processFilters(filters: AppFilter[]) {
    const req: Record<string, Set<string | number>> = {};
    const excl: Record<string, Set<string | number>> = {};
    for (const f of filters) {
        processFilterItem(f, req, excl);
    }
    return { req, excl };
}

const FALLBACKS: Record<string, (string | number)[]> = {
    status: ["todo", "next-up", "doing", "done"],
    priority: [1, 2, MAX_RETRIES, DRAG_THRESHOLD_PX, 0],
};

function processSingleValueCol(
    col: string,
    reqCol: Set<string | number> | undefined,
    exclCol: Set<string | number> | undefined,
    defaults: Record<string, unknown>
) {
    if (reqCol?.size === 1) {
        const val = Array.from(reqCol)[0];
        if (val !== undefined && (!exclCol || !exclCol.has(val))) {
            defaults[col] = val;
        }
        return;
    }
    
    const fallbacks = FALLBACKS[col];
    if (exclCol && fallbacks) {
        for (const fallback of fallbacks) {
            if (!exclCol.has(fallback)) {
                defaults[col] = fallback;
                break;
            }
        }
    }
}

function processSingleValueCols(
    req: Record<string, Set<string | number>>,
    excl: Record<string, Set<string | number>>,
    defaults: Record<string, unknown>
) {
    const singleValueCols = ["status", "priority"];
    for (const col of singleValueCols) {
        processSingleValueCol(col, req[col], excl[col], defaults);
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
            defaults["tags"] = validTags;
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
                const taskTags = e.task?.tags ?? [];
                const allTags = new Set(taskTags.map((t) =>
                    typeof t === "string" ? t.toLowerCase() : "",
                ));
                match = values.some(v => allTags.has(String(v).toLowerCase()));
            } else if (f.column === "taskStatus") {
                match = values.some(v => {
                    if (v === "none") return !e.task;
                    if (v === "done") return e.task?.status === "done";
                    if (v === "todo") return e.task?.status !== "done";
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
            const aDone = (a.task?.status === "done") ? 1 : 0;
            const bDone = (b.task?.status === "done") ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;
        }
        return (a.startTime || "").localeCompare(b.startTime || "");
    });
    return sorted;
}
