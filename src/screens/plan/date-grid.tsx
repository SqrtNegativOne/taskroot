import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    Fragment,
} from "react";
import {
    ymd,
    sameDay,
    addDays,
    startOfMonth,
    startOfWeek,
    getWeekNumber,
    hhmmShort,
    MONTHS,
    MONTHS_LONG,
    DOW_SHORT,
    PAD2,
} from "../../core/store/data";
import { hydrateEvents } from "../../core/domain/events";
import { Icon } from "../../components/icon";

// Month / week calendar — top of right pane.

export function DateGrid({
    view,
    setView,
    anchor,
    setAnchor,
    events,
    tasks,
    filter,
    sort,
    filterMenu,
    today,
    dragState,
    onDropToDate,
    onEventDragStart,
    onAddEvent,
}) {
    // anchor is a Date pointing into the month or week currently shown.
    const isWeek = view === "week" || view === "1 week";
    const is3Weeks = view === "3 weeks";
    const isStrip = isWeek || is3Weeks;

    const cells = React.useMemo(
        () => buildMonthOrWeekCells(anchor, view),
        [anchor, view],
    );
    const hydratedEvents = React.useMemo(() => {
        let evs = hydrateEvents(events, tasks);

        if (filter && Array.isArray(filter) && filter.length > 0) {
            for (const f of filter) {
                if (!f.column || !f.value) continue;
                evs = evs.filter((e) => {
                    let match = false;
                    if (f.column === "type") {
                        match = e.type === f.value;
                    } else if (f.column === "tag") {
                        const eventTags = e.tags || [];
                        const taskTags = e.task && e.task.tags ? e.task.tags : [];
                        const allTags = [...eventTags, ...taskTags].map((t) =>
                            typeof t === "string" ? t.toLowerCase() : "",
                        );
                        match = allTags.includes(f.value.toLowerCase());
                    } else if (f.column === "taskStatus") {
                        if (f.value === "none") {
                            match = !e.task;
                        } else if (f.value === "done") {
                            match = e.task
                                ? e.task.status === "done"
                                : e.isDone;
                        } else if (f.value === "todo") {
                            match = e.task
                                ? e.task.status !== "done"
                                : !e.isDone;
                        }
                    } else if (f.column === "category") {
                        match = (e.category || "") === f.value;
                    }
                    return f.operator === "is not" ? !match : match;
                });
            }
        }

        if (sort) {
            evs.sort((a, b) => {
                if (sort === "taskStatus") {
                    const aDone = a.task
                        ? a.task.status === "done"
                            ? 1
                            : 0
                        : a.isDone
                          ? 1
                          : 0;
                    const bDone = b.task
                        ? b.task.status === "done"
                            ? 1
                            : 0
                        : b.isDone
                          ? 1
                          : 0;
                    if (aDone !== bDone) return aDone - bDone;
                }
                return (a.start || 0) - (b.start || 0);
            });
        }

        return evs;
    }, [events, tasks, filter, sort]);

    const titleLabel = isStrip
        ? weekRangeLabel(cells[0].date, cells[cells.length - 1].date)
        : `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;

    const shift = (n) => {
        const d = new Date(anchor);
        if (isWeek) d.setDate(d.getDate() + 7 * n);
        else if (is3Weeks) d.setDate(d.getDate() + 21 * n);
        else d.setMonth(d.getMonth() + n);
        setAnchor(d);
    };

    const [showViewMenu, setShowViewMenu] = useState(false);
    const [closingViewMenu, setClosingViewMenu] = useState(false);
    const viewMenuRef = useRef(null);

    const closeViewMenu = () => {
        setClosingViewMenu(true);
        setTimeout(() => {
            setShowViewMenu(false);
            setClosingViewMenu(false);
        }, 150);
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
                if (showViewMenu && !closingViewMenu) closeViewMenu();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [showViewMenu, closingViewMenu]);

    return (
        <section className="date-grid-pane">
            <header className="cal-hd">
                <div className="cal-hd-left">
                    <span className="cal-hd-title">{titleLabel}</span>
                </div>
                <div className="cal-hd-right">
                    <div className="cal-nav">
                        <button
                            className="cal-nav-btn"
                            onClick={() => shift(-1)}
                            aria-label="previous"
                        >
                            ◀
                        </button>
                        <button
                            className="cal-nav-btn"
                            onClick={() => setAnchor(new Date(today))}
                        >
                            ◉
                        </button>
                        <button
                            className="cal-nav-btn"
                            onClick={() => shift(1)}
                            aria-label="next"
                        >
                            ▶
                        </button>
                    </div>
                    {filterMenu}
                    <div style={{ position: "relative" }} ref={viewMenuRef}>
                        <button
                            onClick={() => {
                                if (showViewMenu) closeViewMenu();
                                else setShowViewMenu(true);
                            }}
                            title="View options"
                            style={{
                                background: showViewMenu
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
                        >
                            <Icon name="dashboard" size={16} />
                        </button>
                        
                        {showViewMenu && (
                            <div
                                className={`floating-menu ${closingViewMenu ? "is-closing" : ""}`}
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    right: 0,
                                    zIndex: 1000,
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "var(--bg-surface)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--border)",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                    minWidth: "120px",
                                    overflow: "hidden"
                                }}
                            >
                                {["month", "1 week", "3 weeks"].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            setView(mode);
                                            closeViewMenu();
                                        }}
                                        style={{
                                            padding: "8px 12px",
                                            textAlign: "left",
                                            background: view === mode || (view === "week" && mode === "1 week") ? "var(--accent-soft)" : "transparent",
                                            color: view === mode || (view === "week" && mode === "1 week") ? "var(--accent)" : "var(--fg)",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "0.9em",
                                            textTransform: "capitalize"
                                        }}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

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
                            events={hydratedEvents.filter((e) => {
                                const cellDate = ymd(c.date);
                                if (!e.endDate) return e.date === cellDate;
                                return (
                                    cellDate >= e.date && cellDate <= e.endDate
                                );
                            })}
                            tasks={tasks}
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

function DayCell({
    cell,
    today,
    events,
    tasks,
    isWeek,
    dragState,
    onDropToDate,
    onEventDragStart,
    onAddEvent,
}) {
    const ref = React.useRef(null);
    const isToday = sameDay(cell.date, today);
    const isPast = cell.date < today && !isToday;
    const isDragOver =
        dragState?.target?.kind === "grid-day" &&
        dragState.target.date === ymd(cell.date);
    const canAccept = !!dragState;

    React.useEffect(() => {
        if (!dragState) return;
        const el = ref.current;
        if (!el) return;
        el.dataset.dropDate = ymd(cell.date);
        el.dataset.dropKind = "grid-day";
    }, [dragState, cell.date]);

    return (
        <div
            ref={ref}
            data-drop-kind="grid-day"
            data-drop-date={ymd(cell.date)}
            className={[
                "day-cell",
                cell.outOfMonth ? "is-out" : "",
                isToday ? "is-today" : "",
                isPast ? "is-past" : "",
                isWeek ? "is-strip" : "",
                isDragOver ? "is-drag-over" : "",
                canAccept ? "can-accept" : "",
            ].join(" ")}
            onDoubleClick={(e) => {
                if (!(e.target instanceof HTMLElement)) return;
                if (e.target.closest(".day-cell-event")) return;
                if (onAddEvent) onAddEvent(cell.date);
            }}
        >
            <div className="day-cell-hd">
                <span className="day-cell-num">
                    {PAD2(cell.date.getDate())}
                </span>
            </div>
            <div className="day-cell-events">
                {events.map((ev) => {
                    const title = ev.title;
                    const pri = ev.priority;
                    const isDone = ev.isDone;
                    return (
                        <div
                            key={ev.id}
                            className={`day-cell-event ev-${ev.type} ${pri !== null && pri !== undefined ? `pri-bar-${pri}` : ""} ${isDone ? "is-done" : ""}`}
                            title={`${ev.isAllDay ? "All Day" : hhmmShort(ev.start)} — ${title}`}
                            style={{
                                cursor: "grab",
                                opacity:
                                    dragState?.event?.id === ev.id ? 0.4 : 1,
                            }}
                            onPointerDown={(e) =>
                                onEventDragStart &&
                                onEventDragStart(e, ev, ev.task)
                            }
                        >
                            {!ev.isAllDay && (
                                <span className="day-cell-event-time">
                                    {hhmmShort(ev.start)}
                                </span>
                            )}
                            <span className="day-cell-event-title">
                                {title}
                            </span>
                        </div>
                    );
                })}
            </div>
            {isDragOver && (
                <div className="day-cell-drop-hint">
                    <span className="bracket">▸</span> drop to plan
                </div>
            )}
        </div>
    );
}

function buildMonthOrWeekCells(anchor, view) {
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
    // Month: 6 rows × 7 cols, leading from previous month
    const first = startOfMonth(anchor);
    const start = startOfWeek(first);
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const d = addDays(start, i);
        cells.push({ date: d, outOfMonth: d.getMonth() !== anchor.getMonth() });
    }
    return cells;
}

function weekRangeLabel(a, b) {
    const prefix = `Week #${getWeekNumber(a)}/52 `;
    if (a.getMonth() === b.getMonth()) {
        return `${prefix}${MONTHS_LONG[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
    }
    return `${prefix}${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}
