import type { AppTask, AppFilter } from "../../core/domain/models";

export function matchesFilterValue(task: AppTask, column: string, values: (string | number)[]) {
    if (column === "status") return values.includes(task.status || "");
    if (column === "priority") return values.includes(task.priority || 0) || values.includes(String(task.priority));
    if (column === "tag") return values.some((v) => (task.tags || []).includes(String(v)));
    return false;
}

export function checkTaskAgainstFilters(task: AppTask, filters?: AppFilter[]) {
    if (!filters || filters.length === 0) return false;
    for (const f of filters) {
        if (!f.column || (!f.value && f.value !== 0)) continue;
        const values = Array.isArray(f.value) ? f.value : [f.value];
        if (values.length === 0) continue;
        const match = matchesFilterValue(task, f.column, values);
        const passes = f.operator === "is not" ? !match : match;
        if (!passes) return true;
    }
    return false;
}
