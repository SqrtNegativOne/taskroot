import React from "react";
import {
    ymd,
    hhmmShort,
    MONTHS,
    DOW_SHORT,
    PAD2,
    addDays,
    sameDay,
} from "../../core/store/data";
import { hydrateEvents } from "../../core/domain/events";
import { PX_PER_MIN, SNAP_MIN } from "./types";
import type { DayTimelineProps } from "./types";
import { EventBlock } from "./EventBlock";
import { layoutEvents } from "./layout";
import { filterAndSortEvents } from "./filters";

export function DayTimeline({
    events,
    tasks,
    filter,
    sort,
    filterMenu,
    today,
    timelineDate,
    setTimelineDate,
    dragState,
    setDragState,
    onResizeEvent,
    onMoveEvent,
    onEventClick,
    onAddEvent,
}: DayTimelineProps) {
    const containerRef = React.useRef(null);
    const scrollRef = React.useRef(null);

    const viewDate = timelineDate || today;
    const isToday = sameDay(viewDate, today);

    const [createPreview, setCreatePreview] = React.useState<{start: number, end: number} | null>(null);

    // Current-time line
    const [nowMin, setNowMin] = React.useState(() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    });

    // Scroll to current time on first mount (after layout settles)
    React.useEffect(() => {
        const tick = () => {
            if (scrollRef.current) {
                const currentMin = new Date().getHours() * 60 + new Date().getMinutes();
                (scrollRef.current as HTMLDivElement).scrollTop = Math.max(
                    0,
                    (currentMin - 60) * PX_PER_MIN - 12,
                );
            }
        };
        tick();
        const id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, []);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const d = new Date();
            setNowMin(d.getHours() * 60 + d.getMinutes());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    let todayEvents = hydrateEvents(
        events.filter((e) => {
            const cellDate = ymd(viewDate);
            const inRange = e.endDate
                ? cellDate >= e.date && cellDate <= e.endDate
                : e.date === cellDate;
            return inRange && !e.isAllDay;
        }),
        tasks,
    );

    todayEvents = filterAndSortEvents(todayEvents, filter, sort);

    // Compute lanes for overlapping events
    const laid = layoutEvents(todayEvents);

    // Drop preview info
    const dropPreview =
        dragState?.target?.kind === "day-time" ? dragState.target : null;

    const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as Element).closest(".day-event") || (e.target as Element).closest(".day-now"))
            return;
        if (e.button !== 0) return;
        e.preventDefault();

        const grid = containerRef.current as HTMLDivElement | null;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const startY = e.clientY - rect.top;
        const startMin = Math.round(startY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;

        let active = false;

        const move = (ev: PointerEvent) => {
            active = true;
            const currentY = ev.clientY - rect.top;
            const moveMin =
                Math.round(currentY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const s = Math.min(startMin, moveMin);
            const eMin = Math.max(startMin, moveMin);
            setCreatePreview({
                start: s,
                end: eMin === s ? s + SNAP_MIN : eMin,
            });
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                if (onAddEvent) {
                    onAddEvent(timelineDate, startMin, startMin + 60);
                }
                return;
            }
            const currentY = ev.clientY - rect.top;
            const moveMin =
                Math.round(currentY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const s = Math.min(startMin, moveMin);
            const eMin = Math.max(startMin, moveMin);
            const finalEnd = eMin === s ? s + SNAP_MIN : eMin;
            setCreatePreview(null);
            if (onAddEvent) {
                onAddEvent(timelineDate, s, finalEnd);
            }
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    return (
        <section className="day-pane">
            <header className="cal-hd">
                <div
                    className="cal-hd-left"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <button
                        className="cal-nav-btn"
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--fg-dim)",
                        }}
                        onClick={() => setTimelineDate(addDays(viewDate, -1))}
                    >
                        ◀
                    </button>
                    <span
                        className="cal-hd-title"
                        style={{ color: isToday ? "inherit" : "var(--accent)" }}
                    >
                        {DOW_SHORT[viewDate.getDay()]}{" "}
                        {MONTHS[viewDate.getMonth()]} {viewDate.getDate()}
                    </span>
                    <button
                        className="cal-nav-btn"
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--fg-dim)",
                        }}
                        onClick={() => setTimelineDate(addDays(viewDate, 1))}
                    >
                        ▶
                    </button>
                    {!isToday && (
                        <button
                            className="cal-nav-btn"
                            style={{
                                border: "1px solid var(--border)",
                                padding: "2px 8px",
                                background: "none",
                                color: "var(--fg-dim)",
                                cursor: "pointer",
                                fontSize: "11px",
                                marginLeft: "8px",
                                borderRadius: "4px",
                            }}
                            onClick={() => setTimelineDate(today)}
                        >
                            Today
                        </button>
                    )}
                </div>
                <div className="cal-hd-right">{filterMenu}</div>
            </header>

            <div className="day-scroll" ref={scrollRef}>
                <div
                    className="day-grid"
                    ref={containerRef}
                    style={{ height: `${24 * 60 * PX_PER_MIN}px` }}
                    data-drop-kind="day-time"
                    onPointerDown={onGridPointerDown}
                >
                    {Array.from({ length: 24 }, (_, h) => (
                        <div
                            key={h}
                            className="day-hour"
                            style={{
                                top: `${h * 60 * PX_PER_MIN}px`,
                                height: `${60 * PX_PER_MIN}px`,
                            }}
                        >
                            <span
                                className="day-hour-label"
                                style={{
                                    opacity:
                                        isToday &&
                                        Math.abs(h * 60 - nowMin) < 15
                                            ? 0
                                            : 1,
                                }}
                            >
                                {PAD2(h)}:00
                            </span>
                            <div className="day-hour-line" />
                            <div className="day-hour-half" />
                        </div>
                    ))}

                    {/* Now line */}
                    {isToday && (
                        <div
                            className="day-now"
                            style={{ top: `${nowMin * PX_PER_MIN}px` }}
                        >
                            <span className="day-now-label">
                                {PAD2(Math.floor(nowMin / 60))}:
                                {PAD2(nowMin % 60)}
                            </span>
                            <div className="day-now-line" />
                        </div>
                    )}

                    {/* Events */}
                    {laid.map(({ event, lane, lanes }) => (
                        <EventBlock
                            key={event.id}
                            event={event}
                            task={event.task}
                            lane={lane}
                            lanes={lanes}
                            onResize={onResizeEvent}
                            onMove={onMoveEvent}
                            dragState={dragState}
                            setDragState={setDragState}
                            onEventClick={onEventClick}
                        />
                    ))}

                    {/* Create preview */}
                    {createPreview && (
                        <div
                            className="day-event ev-plan is-compact"
                            style={{
                                top: `${createPreview.start * PX_PER_MIN}px`,
                                height: `${(createPreview.end - createPreview.start) * PX_PER_MIN}px`,
                                left: "56px",
                                width: "calc(100% - 58px)",
                                opacity: 0.5,
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            <div className="day-event-inner">
                                <div className="day-event-time">
                                    {hhmmShort(createPreview.start)} –{" "}
                                    {hhmmShort(createPreview.end)}
                                </div>
                                <div className="day-event-title">
                                    New Event...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Drop preview */}
                    {dropPreview && (
                        <div
                            className="day-drop-preview"
                            style={{
                                top: `${dropPreview.minute * PX_PER_MIN}px`,
                                height: `${(dropPreview.duration || 60) * PX_PER_MIN}px`,
                            }}
                        >
                            <span className="day-drop-preview-label">
                                ▸ {hhmmShort(dropPreview.minute)} –{" "}
                                {hhmmShort(
                                    dropPreview.minute +
                                        (dropPreview.duration || 60),
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
