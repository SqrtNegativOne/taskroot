import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../components/icon";
import { useFilterActions } from "./useFilterActions";
import { SelectInput, MultiSelect } from "../../../components/inputs";
import type { FilterSortButtonsProps } from "./types";

export function FilterSortButtons({
    filters,
    setFilters,
    sort,
    setSort,
    columns,
    getValuesForColumn,
    sortOptions,
    align = "left",
}: FilterSortButtonsProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [closingFilters, setClosingFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [closingSort, setClosingSort] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const closeFilters = () => {
        setClosingFilters(true);
        setTimeout(() => {
            setShowFilters(false);
            setClosingFilters(false);
        }, 150);
    };

    const closeSort = () => {
        setClosingSort(true);
        setTimeout(() => {
            setShowSort(false);
            setClosingSort(false);
        }, 150);
    };

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                if (showFilters && !closingFilters) closeFilters();
                if (showSort && !closingSort) closeSort();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () =>
            document.removeEventListener("pointerdown", handleClickOutside);
    }, [showFilters, showSort, closingFilters, closingSort]);

    const { addFilter, updateFilter, removeFilter } = useFilterActions(filters, setFilters, columns, getValuesForColumn);

    const toggleFilters = () => {
        if (showFilters) {
            closeFilters();
        } else {
            setShowFilters(true);
            if (showSort) closeSort();
        }
    };

    const toggleSort = () => {
        if (showSort) {
            closeSort();
        } else {
            setShowSort(true);
            if (showFilters) closeFilters();
        }
    };

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                gap: "8px",
                alignItems: "center",
            }}
            ref={ref}
        >
            <button
                onClick={toggleFilters}
                style={{
                    background:
                        showFilters || filters.length > 0
                            ? "var(--bg-surface)"
                            : "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                    borderRadius: "4px",
                    padding: "4px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                }}
                title="Filter"
            >
                <Icon name="filter_list" size={16} />
                {filters.length > 0 && (
                    <span style={{ fontSize: "0.8em", fontWeight: "bold" }}>
                        {filters.length}
                    </span>
                )}
            </button>

            {sortOptions && (
                <button
                    onClick={toggleSort}
                    style={{
                        background: showSort
                            ? "var(--bg-surface)"
                            : "transparent",
                        border: "1px solid var(--border)",
                        color: "var(--fg)",
                        borderRadius: "4px",
                        padding: "4px 6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                    }}
                    title="Sort"
                >
                    <Icon name="swap_vert" size={16} />
                </button>
            )}

            {showFilters && (
                <div
                    className={`floating-menu ${closingFilters ? "is-closing" : ""}`}
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: align === "left" ? 0 : "auto",
                        right: align === "right" ? 0 : "auto",
                        zIndex: 1000,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "10px",
                        background: "var(--bg-surface)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        minWidth: "320px",
                    }}
                >
                    {filters.map((f) => (
                        <div
                            key={f.id}
                            style={{
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                            }}
                        >
                            <SelectInput
                                value={f.column}
                                onChange={(val: string) =>
                                    updateFilter(f.id, { column: val })
                                }
                                options={columns.map(c => ({ label: c.label, value: c.id }))}
                                style={{ flex: 1 }}
                            />
                            <SelectInput
                                value={f.operator}
                                onChange={(val: string) =>
                                    updateFilter(f.id, { operator: val })
                                }
                                options={[
                                    { label: "is", value: "is" },
                                    { label: "is not", value: "is not" }
                                ]}
                                style={{ width: "75px" }}
                            />
                            <MultiSelect 
                                options={getValuesForColumn(f.column)}
                                values={Array.isArray(f.value) ? f.value.map(String) : [String(f.value)]}
                                onChange={(newValues) => updateFilter(f.id, { value: newValues })}
                            />
                            <button
                                onClick={() => removeFilter(f.id)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px",
                                    color: "var(--fg)",
                                    opacity: 0.6,
                                }}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addFilter}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--fg)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            alignSelf: "flex-start",
                            padding: "4px 4px",
                            fontSize: "0.9em",
                            opacity: 0.8,
                        }}
                    >
                        <Icon name="add" size={14} /> Add filter
                    </button>
                </div>
            )}

            {showSort && sortOptions && (
                <div
                    className={`floating-menu ${closingSort ? "is-closing" : ""}`}
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: align === "left" ? 0 : "auto",
                        right: align === "right" ? 0 : "auto",
                        zIndex: 1000,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "10px",
                        background: "var(--bg-surface)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        minWidth: "200px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "0.9em",
                                color: "var(--fg)",
                                opacity: 0.8,
                            }}
                        >
                            Sort by
                        </span>
                        <SelectInput
                            value={sort}
                            onChange={(val: string) => setSort(val)}
                            options={sortOptions.map(o => ({ label: o.label, value: o.id }))}
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
