import { useMemo } from "react";
import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../../core/utils/constants";
import { PX_PER_MIN } from "../types";
import type { DragState } from "../types";
import { ymd, sameDay } from "../../../core/store/data";
import { layoutEvents } from "../layout";
import type { HydratedEvent } from "../../../core/domain/events";
import { filterEvents, sortEvents } from "../../../core/domain/filters";
import type { AppFilter } from "../../../core/domain/models";

import { useEventCreation } from "../hooks/useEventCreation";
import { TimeGridBackground } from "./TimeGridBackground";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { CreationPreview } from "./CreationPreview";
import { DropPreview } from "./DropPreview";
import { EventBlock } from "../EventBlock";

const LABEL_OFFSET_PX = 56;
const LABEL_OFFSET_COMPACT_PX = 8;

export interface DayColumnProps<T extends DragState = DragState> {
    date: Date;
    today: Date;
    events: HydratedEvent[];
    filter: AppFilter[];
    sort: string;
    dragState?: T;
    setDragState?: (s: T | undefined) => void;
    onResizeEvent?: (id: string, start: number, end: number) => void;
    onMoveEvent?: (id: string, start: number, end: number) => void;
    onEventClick?: (ev: HydratedEvent) => void;
    onAddEvent?: (date: Date, start: number, end: number) => void;
    showTimeLabels?: boolean;
}

export function DayColumn<T extends DragState = DragState>({
    date,
    today,
    events,
    filter,
    sort,
    dragState,
    setDragState,
    onResizeEvent,
    onMoveEvent,
    onEventClick,
    onAddEvent,
    showTimeLabels = true,
}: DayColumnProps<T>) {
    const isToday = sameDay(date, today);
    const { containerRef, createPreview, onGridPointerDown } = useEventCreation(date, onAddEvent);

    const laid = useMemo(() => {
        let dayEvents = events.filter((e: HydratedEvent) => {
            const cellDate = ymd(date);
            const inRange = e.endDate
                ? cellDate >= e.date && cellDate <= e.endDate
                : e.date === cellDate;
            return inRange && !e.isAllDay;
        });
        dayEvents = filterEvents(dayEvents, filter);
        dayEvents = sortEvents(dayEvents, sort);
        return layoutEvents(dayEvents);
    }, [events, date, filter, sort]);

    const dropPreview = dragState?.target?.kind === "day-time" && dragState.target.date === ymd(date) ? dragState.target : undefined;

    return (
        <div
            className="day-grid"
            ref={containerRef}
            style={{
                position: 'relative',
                flex: 1,
                minWidth: '200px',
                height: `${HOURS_PER_DAY * MINUTES_IN_HOUR * PX_PER_MIN}px`,
                borderRight: '1px solid var(--border-soft)'
            }}
            data-drop-kind="day-time"
            data-drop-date={ymd(date)}
            onPointerDown={onGridPointerDown}
            onPointerEnter={() => {
                if (dragState?.event) {
                    setDragState?.({
                        ...dragState,
                        target: {
                            kind: "day-time",
                            date: ymd(date),
                            start: dragState.target?.start || 0,
                            end: dragState.target?.end || 0
                        }
                    });
                }
            }}
        >
            <div style={{ position: 'absolute', top: -32, left: 0, right: 0, textAlign: 'center', fontWeight: 'bold', fontSize: '0.9em', color: isToday ? 'var(--accent)' : 'var(--fg)', paddingBottom: '8px' }}>
                {Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date)}
            </div>
            
            <TimeGridBackground isToday={isToday} showLabels={showTimeLabels} />
            <CurrentTimeLine isToday={isToday} showLabels={showTimeLabels} />

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
                    labelOffset={showTimeLabels ? LABEL_OFFSET_PX : LABEL_OFFSET_COMPACT_PX}
                />
            ))}

            <CreationPreview preview={createPreview} />
            <DropPreview target={dropPreview} />
        </div>
    );
}
