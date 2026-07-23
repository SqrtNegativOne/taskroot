import type { AppFilter } from "./models";

export function computeFilterDefaults(filters: AppFilter[] = []) {
    const req: Record<string, Set<string | number>> = {};
    const excl: Record<string, Set<string | number>> = {};

    for (const f of filters) {
        if (!f.column || !f.value) continue;
        if (f.operator === "is not") {
            if (!excl[f.column]) excl[f.column] = new Set();
            excl[f.column].add(f.value);
        } else {
            if (!req[f.column]) req[f.column] = new Set();
            req[f.column].add(f.value);
        }
    }

    const defaults: Record<string, unknown> = {};
    const FALLBACKS: Record<string, (string | number)[]> = {
        status: ["todo", "next-up", "doing", "done"],
        priority: [1, 2, 3, 4, 0],
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
