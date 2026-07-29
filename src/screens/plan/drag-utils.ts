import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import { isDateString } from "../../core/domain/models";
import { PX_PER_MIN, SNAP_MIN } from "../../components/day-timeline/types";
import type { PlanDragTarget } from "./drag-helpers";

export function resolveDropTarget(el: Element | undefined, y: number, itemDuration: number): PlanDragTarget | undefined {
    if (!el) return undefined;
    // Day calendar grid
    const grid = el.closest('[data-drop-kind="day-time"]');
    if (grid) {
        const rect = grid.getBoundingClientRect();
        const offsetY = y - rect.top;
        const rawMin = offsetY / PX_PER_MIN;
        const snapped = Math.max(
            0,
            Math.min(
                HOURS_PER_DAY * MINUTES_IN_HOUR - SNAP_MIN,
                Math.round(rawMin / SNAP_MIN) * SNAP_MIN,
            ),
        );
        return {
            kind: "day-time",
            minute: snapped,
            duration: itemDuration,
        };
    }
    // Date grid day cell
    const day = el.closest('[data-drop-kind="grid-day"]');
    if (day instanceof HTMLElement) {
        const dropDate = day.dataset.dropDate;
        if (isDateString(dropDate)) {
            return { kind: "grid-day", date: dropDate };
        }
    }
    return undefined;
}

