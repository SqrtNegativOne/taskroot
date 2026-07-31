import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React, { useState, useRef } from 'react';
import { useEvents, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";
import { resolveDropTarget } from "./drag-utils";

import type { PlanDragState } from "./drag-helpers";
import type { InspectorState } from "../../components/inspector-pane";

export const MIN_POLL_INTERVAL_MINUTES = 5;
export const ID_LENGTH = 9;

export const canEditEvent = (ev: AppEvent | undefined, calendars: readonly {id: string, accessRole?: string}[]) => {
    if (!ev) return true;
    const cal = calendars.find(c => c.id === (ev.googleCalendarId || "primary"));
    return !cal || (cal.accessRole !== "reader" && cal.accessRole !== "freeBusyReader");
};

export const setupPointerDrag = (
    e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>,
    onMove: (ev: PointerEvent | MouseEvent) => void,
    onDrop: (active: boolean) => void
) => {
    const start = { x: e.clientX, y: e.clientY };
    let active = false;
    const move = (ev: PointerEvent | MouseEvent) => {
        if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) >= MIN_POLL_INTERVAL_MINUTES) active = true;
        if (active) onMove(ev);
    };
    const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        onDrop(active);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
};

export function useDragAndDrop(
    timelineDate: Date,
    setInspectorState: React.Dispatch<React.SetStateAction<InspectorState | undefined>>,
    createEvent: (task: AppTask, overrides: Partial<AppEvent>) => void
) {
    const [, setEvents] = useEvents();
    const [calendars] = useCalendars();
    
    const [dragState, setDragState] = useState<PlanDragState>();
    const dragRef = useRef<PlanDragState | undefined>(undefined);
    dragRef.current = dragState;

    const onTaskDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, task: AppTask) => {
        e.preventDefault();
        setupPointerDrag(e, (ev) => {
            setDragState({ task, pointerX: ev.clientX, pointerY: ev.clientY, target: resolveDropTarget(document.elementFromPoint(ev.clientX, ev.clientY) || undefined, ev.clientY, task.est || MINUTES_IN_HOUR) });
        }, (active) => {
            if (!active) return setInspectorState({ type: "task", id: task.id });
            const ds = dragRef.current;
            if (ds?.target?.kind === "grid-day" && ds.target.date) {
                const start = ID_LENGTH * MINUTES_IN_HOUR;
                createEvent(task, { date: ds.target.date, endDate: ds.target.date, start, end: start + (task.est || MINUTES_IN_HOUR), isAllDay: true });
            } else if (ds?.target?.kind === "day-time" && ds.target.minute !== undefined) {
                createEvent(task, { date: ymd(timelineDate), endDate: ymd(timelineDate), start: ds.target.minute, end: ds.target.minute + (task.est || MINUTES_IN_HOUR), isAllDay: false });
            }
            setDragState(undefined);
        });
    };

    const onEventDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, eventToMove: AppEvent, task?: AppTask) => {
        if (!canEditEvent(eventToMove, calendars)) {
            e.preventDefault();
            e.stopPropagation();
            return setInspectorState({ type: "event", id: eventToMove.id });
        }
        e.preventDefault();
        e.stopPropagation();

        setupPointerDrag(e, (ev) => {
            setDragState({ event: eventToMove, task, pointerX: ev.clientX, pointerY: ev.clientY, target: resolveDropTarget(document.elementFromPoint(ev.clientX, ev.clientY) || undefined, ev.clientY, task?.est || (eventToMove.end - eventToMove.start)) });
        }, (active) => {
            if (!active) return setInspectorState({ type: "event", id: eventToMove.id });
            const ds = dragRef.current;
            if (ds?.target?.kind === "grid-day" && ds.target.date) {
                const dropDate = ds.target.date;
                setEvents(prev => prev.map((evnt) => evnt.id === eventToMove.id ? { ...evnt, date: dropDate, endDate: dropDate } : evnt));
            } else if (ds?.target?.kind === "day-time" && ds.target.minute !== undefined) {
                const duration = eventToMove.end - eventToMove.start;
                const dropMinute = ds.target.minute;
                setEvents(prev => prev.map((evnt) => evnt.id === eventToMove.id ? { ...evnt, date: ymd(timelineDate), endDate: ymd(timelineDate), start: dropMinute, end: dropMinute + duration, isAllDay: false } : evnt));
            }
            setDragState(undefined);
        });
    };

    return { onTaskDragStart, onEventDragStart, dragState, setDragState };
}
