import * as React from "react";

import type { AppFilter } from "../../../core/domain/models";

export type Filter = AppFilter;

export interface Column {
    id: string;
    label: string;
}

export interface SortOption {
    id: string;
    label: string;
}

export interface FilterSortButtonsProps {
    filters: Filter[];
    setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
    sort: string;
    setSort: (sort: string) => void;
    columns: Column[];
    getValuesForColumn: (columnId: string) => string[];
    sortOptions?: SortOption[];
    align?: "left" | "right";
}
