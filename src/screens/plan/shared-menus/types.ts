import * as React from "react";

export interface Filter {
    id: string;
    column: string;
    operator: string;
    value: string | string[];
}

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
