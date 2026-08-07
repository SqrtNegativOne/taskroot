import { SelectInput } from "../../../components/inputs";
import { FloatingMenu } from "./FloatingMenu";
import type { SortOption } from "./types";
import "./shared-menus.css";

interface SortMenuProps {
    sort: string;
    setSort: (sort: string) => void;
    sortOptions: SortOption[];
    closingSort: boolean;
    align?: "left" | "right";
}

export function SortMenu({
    sort,
    setSort,
    sortOptions,
    closingSort,
    align,
}: SortMenuProps) {
    return (
        <FloatingMenu isClosing={closingSort} {...(align !== undefined ? { align } : {})} minWidth="200px">
            <div className="sort-row">
                <span className="sort-label">Sort by</span>
                <SelectInput
                    value={sort}
                    onChange={(val: string) => setSort(val)}
                    options={sortOptions.map((o: SortOption) => ({
                        label: o.label,
                        value: o.id,
                    }))}
                    style={{ flex: 1 }}
                />
            </div>
        </FloatingMenu>
    );
}
