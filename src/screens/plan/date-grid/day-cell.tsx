import React from "react";
import { ymd, PAD2, sameDay } from "../../../core/store/data";
import type { HydratedEvent } from "../../../core/domain/events";
import { isEventAllDay } from "../../../core/domain/events";
import { Icon } from "../../../components/icon";
import { ICON_WARNING } from "../../../core/utils/icons";
import { extractHourMinuteFromISO } from "../../../core/utils/date-utils";

const OPACITY_FADED = 0.4;
const ANIMATION_DURATION_MS = 150;

function useAnimatedEvents(events: HydratedEvent[]) {
    const [displayEvents, setDisplayEvents] = React.useState(events);
    const [removing, setRemoving] = React.useState<Set<string>>(new Set());
    const [entering, setEntering] = React.useState<Set<string>>(new Set());
    const prevEventsRef = React.useRef(events);
    const displayEventsRef = React.useRef(events);
    const removingRef = React.useRef(removing);
    
    displayEventsRef.current = displayEvents;
    removingRef.current = removing;

    React.useEffect(() => {
        const prevEvents = prevEventsRef.current;
        const displayEvs = displayEventsRef.current;
        const currentRemoving = removingRef.current;
        
        const currentIds = new Set(events.map(e => e.id));
        const prevIds = new Set(prevEvents.map(e => e.id));
        
        const removed = displayEvs.filter(e => !currentIds.has(e.id) && !currentRemoving.has(e.id));
        const added = events.filter(e => !prevIds.has(e.id));

        if (removed.length > 0) {
            setRemoving(prev => {
                const next = new Set(prev);
                removed.forEach(e => next.add(e.id));
                return next;
            });
            
            setTimeout(() => {
                setRemoving(prev => {
                    const next = new Set(prev);
                    removed.forEach(e => next.delete(e.id));
                    return next;
                });
                setDisplayEvents(prev => prev.filter(e => currentIds.has(e.id)));
            }, ANIMATION_DURATION_MS);
        }
        
        if (added.length > 0) {
            setEntering(prev => {
                const next = new Set(prev);
                added.forEach(e => next.add(e.id));
                return next;
            });
            
            setTimeout(() => {
                setEntering(prev => {
                    const next = new Set(prev);
                    added.forEach(e => next.delete(e.id));
                    return next;
                });
            }, ANIMATION_DURATION_MS);
        }
        
        setDisplayEvents(prev => {
            const result: HydratedEvent[] = [];
            const newMap = new Map(events.map(e => [e.id, e]));
            
            for (const item of prev) {
                const val = newMap.get(item.id);
                if (val) {
                    result.push(val);
                    newMap.delete(item.id);
                } else if (removed.some(r => r.id === item.id) || currentRemoving.has(item.id)) {
                    result.push(item);
                }
            }
            
            for (const item of newMap.values()) {
                result.push(item);
            }
            
            return result;
        });

        prevEventsRef.current = events;
    }, [events]);

    return { displayEvents, removing, entering };
}

export function DayCell({
    cell,
    today,
    events,
    isWeek,
    dragState,
    onEventDragStart,
    onAddEvent,
}: {
    cell: { date: Date; outOfMonth: boolean };
    today: Date;
    events: HydratedEvent[];
    isWeek: boolean;
    dragState?: { target?: { kind: string; date?: string }; event?: { id: string } };
    onEventDragStart?: (e: React.PointerEvent<HTMLDivElement>, ev: HydratedEvent, task?: import("../../../core/domain/models").AppTask) => void;
    onAddEvent?: (date: Date) => void;
}) {
    const ref = React.useRef(null);
    const isToday = sameDay(cell.date, today);
    const isPast = cell.date < today && !isToday;
    const isDragOver =
        dragState?.target?.kind === "grid-day" &&
        dragState.target.date === ymd(cell.date);
    const canAccept = !!dragState;

    const { displayEvents, removing, entering } = useAnimatedEvents(events);

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
                {displayEvents.map((ev: HydratedEvent) => (
                    <EventItem 
                        key={ev.id} 
                        ev={ev} 
                        dragState={dragState} 
                        onEventDragStart={onEventDragStart}
                        isEntering={entering.has(ev.id)}
                        isRemoving={removing.has(ev.id)}
                    />
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

function checkPastDue(ev: HydratedEvent): boolean {
    if (!ev.taskId || ev.task?.status === 'done') return false;
    return new Date(ev.endTime).getTime() < Date.now();
}

function EventItem({
    ev,
    dragState,
    onEventDragStart,
    isEntering,
    isRemoving,
}: {
    ev: HydratedEvent;
    dragState?: { event?: { id: string } };
    onEventDragStart?: (e: React.PointerEvent<HTMLDivElement>, ev: HydratedEvent, task?: import("../../../core/domain/models").AppTask) => void;
    isEntering?: boolean;
    isRemoving?: boolean;
}) {
    const title = ev.title;
    const pri = ev.task?.priority;
    const isDone = ev.task?.status === 'done';
    const isPastDue = checkPastDue(ev);
    const isAllDay = isEventAllDay(ev);
    
    return (
        <div
            className={`day-cell-event ev-${ev.type} ${pri !== undefined ? `pri-bar-${pri}` : ""} ${isDone ? "is-done" : ""} ${isEntering ? "is-entering" : ""} ${isRemoving ? "is-removing" : ""}`}
            title={`${isAllDay ? "All Day" : extractHourMinuteFromISO(ev.startTime)} — ${title}`}
            style={{
                cursor: "grab",
                opacity: dragState?.event?.id === ev.id ? OPACITY_FADED : 1,
                ...(ev.color ? { backgroundColor: ev.color, borderLeftColor: ev.color } : {})
            }}
            onPointerDown={(e) =>
                onEventDragStart && onEventDragStart(e, ev, ev.task)
            }
        >
            {!isAllDay && (
                <span className="day-cell-event-time">
                    {extractHourMinuteFromISO(ev.startTime)}
                </span>
            )}
            <span className="day-cell-event-title" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isPastDue && (
                    <Icon name={ICON_WARNING} size={12} style={{ flexShrink: 0, color: 'var(--p0)' }} />
                )}
                {title}
            </span>
        </div>
    );
}
