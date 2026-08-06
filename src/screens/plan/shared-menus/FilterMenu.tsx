import { SelectInput, MultiSelect } from "../../../components/inputs";

import { ICON_CLOSE, ICON_ADD } from "../../../core/utils/icons";
import { Icon } from "../../../components/icon";
import { FloatingMenu } from "./FloatingMenu";
import type { Filter, Column } from "./types";
import "./shared-menus.css";

interface FilterMenuProps {
    filters: Filter[];
    columns: Column[];
    getValuesForColumn: (columnId: string) => string[];
    updateFilter: (id: string, updates: Partial<Filter>) => void;
    removeFilter: (id: string) => void;
    addFilter: () => void;
    closingFilters: boolean;
    align?: "left" | "right";
}

export function FilterMenu({
    filters,
    columns,
    getValuesForColumn,
    updateFilter,
    removeFilter,
    addFilter,
    closingFilters,
    align,
}: FilterMenuProps) {
    return (
        <FloatingMenu isClosing={closingFilters} align={align} minWidth="320px">
            {filters.map((f: Filter) => (
                <div key={f.id} className="filter-row">
                    <SelectInput
                        value={f.column}
                        onChange={(val: string) => updateFilter(f.id || "", { column: val })}
                        options={columns.map((c: Column) => ({ label: c.label, value: c.id }))}
                        style={{ flex: 1 }}
                    />
                    <SelectInput
                        value={f.operator}
                        onChange={(val: string) => updateFilter(f.id || "", { operator: val })}
                        options={[
                            { label: "is", value: "is" },
                            { label: "is not", value: "is not" },
                        ]}
                        style={{ width: "75px" }}
                    />
                    <MultiSelect
                        options={getValuesForColumn(f.column)}
                        values={Array.isArray(f.value) ? f.value.map(String) : [String(f.value)]}
                        onChange={(newValues) => updateFilter(f.id || "", { value: newValues })}
                    />
                    <button
                        onClick={() => removeFilter(f.id || "")}
                        className="filter-remove-button"
                    >
                        <Icon name={ICON_CLOSE} size={16} />
                    </button>
                </div>
            ))}
            <button onClick={addFilter} className="filter-add-button">
                <Icon name={ICON_ADD} size={14} /> Add filter
            </button>
        </FloatingMenu>
    );
}
