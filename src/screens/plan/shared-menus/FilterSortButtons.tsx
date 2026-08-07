import { useEffect, useRef } from "react";
import { useFilterActions } from "./useFilterActions";
import { FilterMenu } from "./FilterMenu";
import { SortMenu } from "./SortMenu";
import { ICON_FILTER, ICON_SORT } from "../../../core/utils/icons";
import { MenuTriggerButton } from "./MenuTriggerButton";
import { useAnimatedMenu } from "./useAnimatedMenu";
import type { FilterSortButtonsProps } from "./types";
import "./shared-menus.css";

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
    const filterMenu = useAnimatedMenu();
    const sortMenu = useAnimatedMenu();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (ref.current && !(e.target instanceof Node && ref.current.contains(e.target))) {
                if (filterMenu.isOpen && !filterMenu.isClosing) filterMenu.close();
                if (sortMenu.isOpen && !sortMenu.isClosing) sortMenu.close();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
        
    }, [filterMenu, sortMenu]);

    const { addFilter, updateFilter, removeFilter } = useFilterActions(
        filters,
        setFilters,
        columns,
        getValuesForColumn
    );

    const handleToggleFilters = () => {
        if (filterMenu.isOpen) {
            filterMenu.close();
        } else {
            filterMenu.open();
            if (sortMenu.isOpen) sortMenu.close();
        }
    };

    const handleToggleSort = () => {
        if (sortMenu.isOpen) {
            sortMenu.close();
        } else {
            sortMenu.open();
            if (filterMenu.isOpen) filterMenu.close();
        }
    };

    return (
        <div className="filter-sort-container" ref={ref}>
            <MenuTriggerButton
                isActive={filterMenu.isOpen || filters.length > 0}
                onClick={handleToggleFilters}
                icon={ICON_FILTER}
                title="Filter"
                badgeCount={filters.length}
            />

            {sortOptions && (
                <MenuTriggerButton
                    isActive={sortMenu.isOpen}
                    onClick={handleToggleSort}
                    icon={ICON_SORT}
                    title="Sort"
                />
            )}

            {filterMenu.isOpen && (
                <FilterMenu
                    filters={filters}
                    columns={columns}
                    getValuesForColumn={getValuesForColumn}
                    updateFilter={updateFilter}
                    removeFilter={removeFilter}
                    addFilter={addFilter}
                    closingFilters={filterMenu.isClosing}
                    align={align}
                />
            )}

            {sortMenu.isOpen && sortOptions && (
                <SortMenu
                    sort={sort}
                    setSort={setSort}
                    sortOptions={sortOptions}
                    closingSort={sortMenu.isClosing}
                    align={align}
                />
            )}
        </div>
    );
}
