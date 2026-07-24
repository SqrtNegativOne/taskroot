import React, {
    useState,
    Fragment,
} from "react";
import {
    ymd,
    hhmmShort,
    MONTHS,
    DOW_SHORT,
    PAD2,
    addDays,
    sameDay,
} from "../core/store/data";
import { hydrateEvents } from "../core/domain/events";
import type { AppEvent, HydratedEvent } from "../core/domain/events";
import type { AppTask, AppFilter } from "../core/domain/models";

// Day timeline: vertical, 24h scrollable, with drag-to-schedule + resize.

export const PX_PER_MIN = 56 / 60; // 56 px per hour
export const SNAP_MIN = 15;

export interface DragStateTarget {
    kind: string;
    minute: number;
    duration?: number;
}
export interface DragState {
    target: DragStateTarget | null;
}

export interface DayTimelineProps {
    events: AppEvent[];
    tasks: AppTask[];
    filter?: AppFilter[];
    sort?: string;
    filterMenu?: React.ReactNode;
    today: Date;
    timelineDate: Date;
    setTimelineDate: (d: Date) => void;
    dragState: DragState | null;
    setDragState: React.Dispatch<React.SetStateAction<DragState | null>>;
    onDropToTime?: (e: unknown) => void;
    onResizeEvent: (id: string, start: number, end: number) => void;
    onMoveEvent: (id: string, start: number, end: number) => void;
    onEventClick?: (e: HydratedEvent) => void;
    onAddEvent?: (d: Date, start: number, end: number) => void;
}

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

    if (filter && Array.isArray(filter) && filter.length > 0) {
        for (const f of filter) {
            if (!f.column || !f.value) continue;
            todayEvents = todayEvents.filter((e) => {
                let match = false;
                if (f.column === "type") {
                    match = e.type === f.value;
                } else if (f.column === "tag") {
                    const taskTags = (e.task ? e.task.tags : []) || [];
                    const allTags = taskTags.map((t) =>
                        typeof t === "string" ? t.toLowerCase() : "",
                    );
                    match = allTags.includes(String(f.value).toLowerCase());
                } else if (f.column === "taskStatus") {
                    if (f.value === "none") {
                        match = !e.task;
                    } else if (f.value === "done") {
                        match = e.task ? e.task.status === "done" : e.isDone;
                    } else if (f.value === "todo") {
                        match = e.task ? e.task.status !== "done" : !e.isDone;
                    }
                } else if (f.column === "category") {
                    match = (e.category || "") === f.value;
                }
                return f.operator === "is not" ? !match : match;
            });
        }
    }

    todayEvents.sort((a, b) => {
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
        return (a.start || 0) - (b.start || 0); // fallback to time
    });

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

interface EventBlockProps {
    event: HydratedEvent;
    task?: AppTask;
    lane: number;
    lanes: number;
    onResize: (id: string, start: number, end: number) => void;
    onMove: (id: string, start: number, end: number) => void;
    dragState?: DragState | null;
    setDragState?: React.Dispatch<React.SetStateAction<DragState | null>>;
    onEventClick?: (e: HydratedEvent) => void;
}

function EventBlock({
    event,
    task,
    lane,
    lanes,
    onResize,
    onMove,
    onEventClick,
}: EventBlockProps) {
    const [dragOffset, setDragOffset] = useState<number | null>(null);

    const title = event.title;
    const pri = event.priority;

    const onResizeStart = (edge: "top" | "bottom") => (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const startStart = event.start;
        const startEnd = event.end || 0;
        const move = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const dm = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            if (edge === "bottom") {
                const newEnd = Math.max(
                    startStart + SNAP_MIN,
                    Math.min(24 * 60, startEnd + dm),
                );
                onResize(event.id, startStart, newEnd);
            } else {
                const newStart = Math.max(
                    0,
                    Math.min(startEnd - SNAP_MIN, startStart + dm),
                );
                onResize(event.id, newStart, startEnd);
            }
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const onBodyDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as Element).closest(".day-event-handle")) return;
        if (e.button !== 0) return;
        e.preventDefault();
        const startY = e.clientY;
        const startStart = event.start || 0;
        const startEnd = event.end || 0;
        let moved = false;
        let finalDm = 0;
        const move = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            if (!moved && Math.abs(dy) < 4) return;
            moved = true;
            const dm = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const minDm = -startStart;
            const maxDm = 24 * 60 - startEnd;
            finalDm = Math.max(minDm, Math.min(maxDm, dm));
            setDragOffset(finalDm);
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!moved) {
                if (onEventClick) onEventClick(event);
                return;
            }
            setDragOffset(null);
            if (finalDm !== 0) {
                onMove(
                    event.id,
                    startStart + finalDm,
                    startStart + finalDm + (startEnd - startStart),
                );
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const renderBlock = (start: number, end: number, isGhost: boolean, isFloating: boolean) => {
        const top = start * PX_PER_MIN;
        const height = (end - start) * PX_PER_MIN;
        const compact = height < 40;
        const isDone = event.isDone;

        return (
            <div
                className={`day-event ev-${event.type} ${pri ? `pri-bar-${pri}` : ""} ${compact ? "is-compact" : ""} ${isDone ? "is-done" : ""} ${isGhost ? "is-ghost" : ""} ${isFloating ? "is-floating" : ""}`}
                style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 18)}px`,
                    left: `calc(56px + ((100% - 56px) / ${lanes}) * ${lane})`,
                    width: `calc(((100% - 56px) / ${lanes}) - 2px)`,
                }}
                onPointerDown={isGhost ? undefined : onBodyDown}
                key={isGhost ? "ghost" : "main"}
            >
                <div
                    className="day-event-handle day-event-handle-top"
                    onPointerDown={isGhost ? undefined : onResizeStart("top")}
                />
                <div className="day-event-inner">
                    <div className="day-event-title">
                        {pri !== null && pri !== undefined && (
                            <span className={`pri pri-${pri}`}>●</span>
                        )}
                        {title}
                    </div>
                    <div className="day-event-time">
                        {PAD2(Math.floor(start / 60))}:{PAD2(start % 60)} –{" "}
                        {PAD2(Math.floor(end / 60))}:{PAD2(end % 60)}
                    </div>
                    {!compact &&
                        event.type === "plan" &&
                        task &&
                        (task.tags || []).length > 0 && (
                            <div className="day-event-tags">
                                {(task.tags || []).map((t) => (
                                    <span key={t} className="day-event-tag">
                                        #{t}
                                    </span>
                                ))}
                            </div>
                        )}
                </div>
                <div
                    className="day-event-handle day-event-handle-bottom"
                    onPointerDown={
                        isGhost ? undefined : onResizeStart("bottom")
                    }
                >
                    <span className="day-event-handle-grip">═</span>
                </div>
            </div>
        );
    };

    if (dragOffset !== null) {
        return (
            <Fragment>
                {renderBlock(event.start || 0, event.end || 0, true, false)}
                {renderBlock(
                    (event.start || 0) + dragOffset,
                    (event.end || 0) + dragOffset,
                    false,
                    true,
                )}
            </Fragment>
        );
    }
    return renderBlock(event.start || 0, event.end || 0, false, false);
}

// Simple overlap layout: assign each event to the earliest lane that's free.
function layoutEvents(events: HydratedEvent[]) {
    const placed: { start: number, end: number, lane: number }[] = [];
    const result: { event: HydratedEvent, lane: number, lanes?: number }[] = [];
    for (const ev of events) {
        let lane = 0;
        while (
            placed.some(
                (p) =>
                    p.lane === lane &&
                    !(p.end <= (ev.start || 0) || p.start >= (ev.end || 0)),
            )
        ) {
            lane++;
        }
        placed.push({ start: ev.start || 0, end: ev.end || 0, lane });
        result.push({ event: ev, lane });
    }
    // Determine total lanes per cluster (events that overlap any chain)
    // For simplicity, use max lanes among overlapping events.
    return result.map((r) => {
        let maxLane = r.lane;
        for (const p of placed) {
            if (!(p.end <= (r.event.start || 0) || p.start >= (r.event.end || 0))) {
                if (p.lane > maxLane) maxLane = p.lane;
            }
        }
        return { ...r, lanes: maxLane + 1 };
    });
}
