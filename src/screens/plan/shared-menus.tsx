import { useState, useEffect, useRef } from "react";
import { Icon } from "../../components/icon";

export interface Filter {
    id: string;
    column: string;
    operator: string;
    value: string | string[];
}

function MultiSelect({ options, values, onChange }: { options: string[], values: string[], onChange: (v: string[]) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    const toggle = (opt: string) => {
        if (values.includes(opt)) {
            onChange(values.filter(v => v !== opt));
        } else {
            onChange([...values, opt]);
        }
    };

    return (
        <div ref={ref} style={{ position: "relative", flex: 1.5 }}>
            <button
                type="button"
                className="selector-input" 
                style={{
                    padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-app)", color: "var(--fg)", cursor: "pointer", minHeight: "24px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px",
                    width: "100%", textAlign: "left", fontFamily: "inherit", fontSize: "inherit"
                }}
                onClick={() => setOpen(!open)}
            >
                {values.length === 0 ? <span style={{opacity: 0.5}}>None</span> : values.join(", ")}
            </button>
            {open && (
                <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1001, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px", maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", marginTop: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}>
                    {options.map(o => (
                        <button 
                            key={o} 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggle(o); }} 
                            style={{
                                padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                                background: values.includes(o) ? "var(--accent-soft)" : "transparent",
                                width: "100%", border: "none", textAlign: "left", color: "inherit", fontFamily: "inherit", fontSize: "inherit"
                            }}
                        >
                            <input type="checkbox" checked={values.includes(o)} readOnly style={{margin: 0}} />
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
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

function useFilterActions(filters: Filter[], setFilters: React.Dispatch<React.SetStateAction<Filter[]>>, columns: Column[], getValuesForColumn: (c: string) => string[]) {
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
                            <select
                                value={f.column}
                                onChange={(e) =>
                                    updateFilter(f.id, {
                                        column: e.target.value,
                                    })
                                }
                                className="selector-input"
                                style={{
                                    flex: 1,
                                    padding: "4px 8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: "4px",
                                    background: "var(--bg-app)",
                                    color: "var(--fg)",
                                }}
                            >
                                {columns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={f.operator}
                                onChange={(e) =>
                                    updateFilter(f.id, {
                                        operator: e.target.value,
                                    })
                                }
                                className="selector-input"
                                style={{
                                    width: "75px",
                                    padding: "4px 8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: "4px",
                                    background: "var(--bg-app)",
                                    color: "var(--fg)",
                                }}
                            >
                                <option value="is">is</option>
                                <option value="is not">is not</option>
                            </select>
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
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="selector-input"
                            style={{
                                flex: 1,
                                padding: "4px 8px",
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                background: "var(--bg-app)",
                                color: "var(--fg)",
                            }}
                        >
                            {sortOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
