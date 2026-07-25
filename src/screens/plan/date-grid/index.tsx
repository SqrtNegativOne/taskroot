import { useMemo } from "react";
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
    onDropToDate,
    onEventDragStart,
    onAddEvent,
}: any) {
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
        if (isWeek) d.setDate(d.getDate() + 7 * n);
        else if (is3Weeks) d.setDate(d.getDate() + 21 * n);
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
                    {cells.map((c, i) => (
                        <DayCell
                            key={i}
                            cell={c}
                            today={today}
                            events={displayEvents.filter((e: HydratedEvent) => {
                                const cellDate = ymd(c.date);
                                if (!e.endDate) return e.date === cellDate;
                                return (
                                    cellDate >= e.date && cellDate <= e.endDate
                                );
                            })}
                            isWeek={isStrip}
                            dragState={dragState}
                            onDropToDate={onDropToDate}
                            onEventDragStart={onEventDragStart}
                            onAddEvent={onAddEvent}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function buildMonthOrWeekCells(anchor: any, view: any) {
    if (view === "1 week" || view === "week") {
        const start = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => ({
            date: addDays(start, i),
            outOfMonth: false,
        }));
    }
    if (view === "3 weeks") {
        const start = startOfWeek(anchor);
        return Array.from({ length: 21 }, (_, i) => ({
            date: addDays(start, i),
            outOfMonth: false,
        }));
    }
    const first = startOfMonth(anchor);
    const start = startOfWeek(first);
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const d = addDays(start, i);
        cells.push({ date: d, outOfMonth: d.getMonth() !== anchor.getMonth() });
    }
    return cells;
}

function weekRangeLabel(a: any, b: any) {
    const prefix = `Week #${getWeekNumber(a)}/52 `;
    if (a.getMonth() === b.getMonth()) {
        return `${prefix}${MONTHS_LONG[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
    }
    return `${prefix}${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}
