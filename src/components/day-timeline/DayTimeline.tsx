import React, { useMemo } from "react";
import { ymd, sameDay, addDays } from "../../core/store/data";
import type { DayTimelineProps, DragState } from "./types";

import { useCurrentTimeScroll } from "./hooks/useCurrentTimeScroll";
import { TimelineHeader } from "./components/TimelineHeader";
import { DayColumn } from "./components/DayColumn";

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
    const scrollRef = useCurrentTimeScroll();

    const [numDays, setNumDays] = React.useState(1);

    const dates = useMemo(() => {
        return Array.from({ length: numDays }, (_, i) => addDays(viewDate, i));
    }, [numDays, viewDate]);

    return (
        <section className="day-pane">
            <TimelineHeader
                viewDate={viewDate}
                isToday={isToday}
                today={today}
                setTimelineDate={setTimelineDate}
                filterMenu={filterMenu}
                numDays={numDays}
                setNumDays={setNumDays}
            />

            <div className="day-scroll" ref={scrollRef}>
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                    {dates.map((d, i) => (
                        <DayColumn
                            key={ymd(d)}
                            date={d}
                            today={today}
                            events={events}
                            filter={filter || []}
                            sort={sort || ""}
                            {...(dragState !== undefined ? { dragState } : {})}
                            {...(setDragState !== undefined ? { setDragState } : {})}
                            onResizeEvent={onResizeEvent}
                            onMoveEvent={onMoveEvent}
                            {...(onEventClick !== undefined ? { onEventClick } : {})}
                            {...(onAddEvent !== undefined ? { onAddEvent } : {})}
                            showTimeLabels={i === 0}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
