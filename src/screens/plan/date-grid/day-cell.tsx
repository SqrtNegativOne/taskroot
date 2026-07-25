import React from "react";
import { ymd, hhmmShort, PAD2, sameDay } from "../../../core/store/data";
import type { HydratedEvent } from "../../../core/domain/events";

export function DayCell({
    cell,
    today,
    events,
    isWeek,
    dragState,
    onEventDragStart,
    onAddEvent,
}: any) {
    const ref = React.useRef(null);
    const isToday = sameDay(cell.date, today);
    const isPast = cell.date < today && !isToday;
    const isDragOver =
        dragState?.target?.kind === "grid-day" &&
        dragState.target.date === ymd(cell.date);
    const canAccept = !!dragState;

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
                {events.map((ev: HydratedEvent) => (
                    <EventItem key={ev.id} ev={ev} dragState={dragState} onEventDragStart={onEventDragStart} />
                ))}
            </div>
            {isDragOver && (
                <div className="day-cell-drop-hint">
                    <span className="bracket">▸</span> drop to plan
                </div>
            )}
        </div>
    );
}

function EventItem({ ev, dragState, onEventDragStart }: any) {
    const title = ev.title;
    const pri = ev.priority;
    const isDone = ev.isDone;
    return (
        <div
            className={`day-cell-event ev-${ev.type} ${pri !== null && pri !== undefined ? `pri-bar-${pri}` : ""} ${isDone ? "is-done" : ""}`}
            title={`${ev.isAllDay ? "All Day" : hhmmShort(ev.start)} — ${title}`}
            style={{
                cursor: "grab",
                opacity: dragState?.event?.id === ev.id ? 0.4 : 1,
            }}
            onPointerDown={(e) =>
                onEventDragStart && onEventDragStart(e, ev, ev.task)
            }
        >
            {!ev.isAllDay && (
                <span className="day-cell-event-time">
                    {hhmmShort(ev.start)}
                </span>
            )}
            <span className="day-cell-event-title">{title}</span>
        </div>
    );
}
