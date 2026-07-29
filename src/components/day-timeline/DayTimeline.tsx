import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import { useMemo } from "react";
import { ymd, sameDay } from "../../core/store/data";
import type { HydratedEvent } from "../../core/domain/events";
import { PX_PER_MIN } from "./types";
import type { DayTimelineProps, DragState } from "./types";
import { EventBlock } from "./EventBlock";
import { layoutEvents } from "./layout";
import { filterEvents, sortEvents } from "../../core/domain/filters";

import { useCurrentTimeScroll } from "./hooks/useCurrentTimeScroll";
import { useEventCreation } from "./hooks/useEventCreation";
import { TimelineHeader } from "./components/TimelineHeader";
import { TimeGridBackground } from "./components/TimeGridBackground";
import { CurrentTimeLine } from "./components/CurrentTimeLine";
import { CreationPreview } from "./components/CreationPreview";
import { DropPreview } from "./components/DropPreview";

export function DayTimeline<T extends DragState = DragState>({
    events,
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
}: DayTimelineProps<T>) {
    const viewDate = timelineDate || today;
    const isToday = sameDay(viewDate, today);

    const { containerRef, createPreview, onGridPointerDown } = useEventCreation(viewDate, onAddEvent);
    const scrollRef = useCurrentTimeScroll();

    const laid = useMemo(() => {
        let todayEvents = events.filter((e: HydratedEvent) => {
            const cellDate = ymd(viewDate);
            const inRange = e.endDate
                ? cellDate >= e.date && cellDate <= e.endDate
                : e.date === cellDate;
            return inRange && !e.isAllDay;
        });

        todayEvents = filterEvents(todayEvents, filter);
        todayEvents = sortEvents(todayEvents, sort);

        return layoutEvents(todayEvents);
    }, [events, viewDate, filter, sort]);

    const dropPreview =
        dragState?.target?.kind === "day-time" ? dragState.target : null;

    return (
        <section className="day-pane">
            <TimelineHeader
                viewDate={viewDate}
                isToday={isToday}
                today={today}
                setTimelineDate={setTimelineDate}
                filterMenu={filterMenu}
            />

            <div className="day-scroll" ref={scrollRef}>
                <div
                    className="day-grid"
                    ref={containerRef}
                    style={{ height: `${HOURS_PER_DAY * MINUTES_IN_HOUR * PX_PER_MIN}px` }}
                    data-drop-kind="day-time"
                    onPointerDown={onGridPointerDown}
                >
                    <TimeGridBackground isToday={isToday} />
                    <CurrentTimeLine isToday={isToday} />

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

                    <CreationPreview preview={createPreview} />
                    <DropPreview target={dropPreview} />
                </div>
            </div>
        </section>
    );
}
