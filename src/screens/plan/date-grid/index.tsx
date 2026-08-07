import React from "react";
import { useMemo } from "react";
import { MS_PER_DAY } from "../../../core/utils/constants";
import {
    ymd,
    addDays,
    startOfMonth,
    startOfWeek,
    getWeekNumber,
    MONTHS,
    MONTHS_LONG,
    DOW_SHORT,
} from "../../../core/store/data";
import { CalendarHeader } from "./calendar-header";
import { DayCell } from "./day-cell";
import { filterEvents, sortEvents } from "../../../core/domain/filters";
import type { HydratedEvent } from "../../../core/domain/events";
import type { AppFilter } from "../../../core/domain/models";

const DAYS_IN_CALENDAR_GRID = 42;
const DAYS_IN_WEEK = 7;
const DAYS_IN_THREE_WEEKS = 21;

export const DateGridView = {
    Month: "month",
    Week: "week",
    OneWeek: "1 week",
    ThreeWeeks: "3 weeks"
} as const;
export type DateGridView = typeof DateGridView[keyof typeof DateGridView];


export function DateGrid({
    view,
    setView,
    anchor,
    setAnchor,
    events,
    filter,
    sort,
    filterMenu,
    today,
    dragState,

    onEventDragStart,
    onAddEvent,
}: {
    view: DateGridView;
    setView: (v: DateGridView) => void;
    anchor: Date;
    setAnchor: (d: Date) => void;
    events: HydratedEvent[];
    filter: AppFilter[];
    sort: string;
    filterMenu: React.ReactNode;
    today: Date;
    dragState?: { target?: { kind: string; date?: string }; event?: { id: string } };
    onEventDragStart?: (e: React.PointerEvent<HTMLDivElement>, ev: HydratedEvent, task?: import("../../../core/domain/models").AppTask) => void;
    onAddEvent?: (date: Date) => void;
}) {
    const isWeek = view === "week" || view === "1 week";
    const is3Weeks = view === "3 weeks";
    const isStrip = isWeek || is3Weeks;

    const cells = useMemo(
        () => buildMonthOrWeekCells(anchor, view),
        [anchor, view],
    );

    const displayEvents = useMemo(() => {
        const filtered = filterEvents(events, filter);
        return sortEvents(filtered, sort);
    }, [events, filter, sort]);

    const titleLabel = isStrip
        ? weekRangeLabel(cells[0].date, cells[cells.length - 1].date)
        : `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;

    const shift = (n: number) => {
        const d = new Date(anchor);
        if (isWeek) d.setDate(d.getDate() + DAYS_IN_WEEK * n);
        else if (is3Weeks) d.setDate(d.getDate() + DAYS_IN_THREE_WEEKS * n);
        else d.setMonth(d.getMonth() + n);
        setAnchor(d);
    };

    return (
        <section className="date-grid-pane">
            <CalendarHeader
                titleLabel={titleLabel}
                today={today}
                view={view}
                setView={setView}
                setAnchor={setAnchor}
                shift={shift}
                filterMenu={filterMenu}
            />

            <div className={`cal-grid ${isStrip ? "is-strip" : "is-grid"}`}>
                <div className="cal-dow">
                    {DOW_SHORT.map((d) => (
                        <div key={d} className="cal-dow-cell">
                            {d.toLowerCase()}
                        </div>
                    ))}
                </div>
                <div className={`cal-cells ${isStrip ? (is3Weeks ? "is-strip-3" : "is-strip-1") : "is-grid"}`}>
                    {cells.map((c) => (
                        <DayCell
                            key={c.date.toISOString()}
                            cell={c}
                            today={today}
                            events={displayEvents.filter((e: HydratedEvent) => {
                                const cellDate = ymd(c.date);
                                const cellStart = new Date(`${cellDate}T00:00:00`).getTime();
                                const cellEnd = cellStart + MS_PER_DAY;
                                const eStart = new Date(e.startTime).getTime();
                                const eEnd = new Date(e.endTime).getTime();
                                return eStart < cellEnd && eEnd > cellStart;
                            })}
                            isWeek={isStrip}
                            dragState={dragState}
                            onEventDragStart={onEventDragStart}
                            onAddEvent={onAddEvent}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function buildMonthOrWeekCells(anchor: Date, view: DateGridView) {
    if (view === DateGridView.OneWeek || view === DateGridView.Week) {
        const start = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => ({
            date: addDays(start, i),
            outOfMonth: false,
        }));
    }
    if (view === DateGridView.ThreeWeeks) {
        const start = startOfWeek(anchor);
        return Array.from({ length: 21 }, (_, i) => ({
            date: addDays(start, i),
            outOfMonth: false,
        }));
    }
    const first = startOfMonth(anchor);
    const start = startOfWeek(first);
    const cells = [];
    for (let i = 0; i < DAYS_IN_CALENDAR_GRID; i++) {
        const d = addDays(start, i);
        cells.push({ date: d, outOfMonth: d.getMonth() !== anchor.getMonth() });
    }
    return cells;
}

function weekRangeLabel(a: Date, b: Date) {
    const prefix = `Week #${getWeekNumber(a)}/52 `;
    if (a.getMonth() === b.getMonth()) {
        return `${prefix}${MONTHS_LONG[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
    }
    return `${prefix}${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}
