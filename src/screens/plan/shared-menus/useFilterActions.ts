import type { Filter, Column } from "./types";
import type { Dispatch, SetStateAction } from "react";

export function useFilterActions(filters: Filter[], setFilters: Dispatch<SetStateAction<Filter[]>>, columns: Column[], getValuesForColumn: (c: string) => string[]) {
    const addFilter = () => {
        const firstCol = columns[0].id;
        const firstVal = [getValuesForColumn(firstCol)[0] || ""];
        setFilters([
            ...filters,
            {
                id: Date.now().toString(),
                column: firstCol,
                operator: "is",
                value: firstVal,
            },
        ]);
    };

    const updateFilter = (id: string, updates: Partial<Filter>) => {
        setFilters((fs) =>
            fs.map((f) => {
                if (f.id !== id) return f;
                const nf = { ...f, ...updates };
                if (updates.column && updates.column !== f.column) {
                    nf.value = [getValuesForColumn(updates.column)[0] || ""];
                }
                return nf;
            }),
        );
    };

    const removeFilter = (id: string) => {
        setFilters((fs) => fs.filter((f) => f.id !== id));
    };

    return { addFilter, updateFilter, removeFilter };
}
