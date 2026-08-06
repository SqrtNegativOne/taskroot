import React from "react";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { expandEventsForView } from "../../core/domain/rrule-utils";
import { hydrateEvents } from "../../core/domain/events";
import { useCalendars } from "../../core/store/hooks";

export const PLAN_EVENT_FILTER_COLUMNS = [
    { id: "type", label: "Type" },
    { id: "tag", label: "Tag" },
    { id: "taskStatus", label: "Task Status" },
    { id: "category", label: "Category" },
];

export const PLAN_EVENT_SORT_OPTIONS = [
    { id: "time", label: "Time" },
    { id: "taskStatus", label: "Task Completed" },
];

export function usePlanEvents(tasks: AppTask[], events: AppEvent[], anchor: Date) {
    const allEventTags = React.useMemo(() => {
        const s = new Set<string>();
        tasks.forEach((t: AppTask) => (t.tags || []).forEach((tag) => s.add(tag)));
        return Array.from(s).toSorted();
    }, [tasks]);

    const visibleEvents = React.useMemo(() => {
        const start = new Date(anchor);
        start.setMonth(start.getMonth() - 2);
        const end = new Date(anchor);
        end.setMonth(end.getMonth() + 2);
        return expandEventsForView(events, start, end);
    }, [events, anchor]);

    const [calendars] = useCalendars();

    const hydratedEvents = React.useMemo(() => {
        return hydrateEvents(visibleEvents, tasks, calendars);
    }, [visibleEvents, tasks, calendars]);

    // TODO: Types and status should not be hardcoded. Also look for other places where it might be hardcoded.
    const getEventFilterValues = React.useCallback(
        (col: string) => {
            if (col === "type") return ["info", "busy", "log"];
            if (col === "tag") return allEventTags;
            if (col === "taskStatus") return ["todo", "done", "none"];
            if (col === "category") {
                const s = new Set<string>();
                calendars.forEach(c => {
                    if (c.summary) s.add(c.summary);
                });
                return Array.from(s).toSorted();
            }
            return [];
        },
        [allEventTags, events],
    );

    return { hydratedEvents, getEventFilterValues };
}
