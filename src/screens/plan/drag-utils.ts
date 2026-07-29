export function resolveDropTarget(el: Element | null, _x: number, y: number, task?: AppTask | null, event?: AppEvent | null): PlanDragTarget | null {
    if (!el) return null;
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
            duration: task?.est || (event ? event.end - event.start : MINUTES_IN_HOUR),
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
    return null;
}

