import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React, { useState, useRef } from 'react';
import { useEvents, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";
import { resolveDropTarget } from "./drag-utils";

import type { PlanDragState } from "./drag-helpers";

export const MIN_POLL_INTERVAL_MINUTES = 5;
export const ID_LENGTH = 9;


export function useDragAndDrop(
    timelineDate: Date,
    setInspectorState: React.Dispatch<React.SetStateAction<{ type: string, id: string } | null>>,
    createEvent: (task: AppTask, date: import("../../core/domain/models").DateString, start: number, duration: number, isAllDay?: boolean) => void
) {
    const [, setEvents] = useEvents();
    const [calendars] = useCalendars();
    
    const [dragState, setDragState] = useState<PlanDragState | null>(null);
    const dragRef = useRef<PlanDragState | null>(null);
    dragRef.current = dragState;

    const onTaskDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, task: AppTask) => {
        e.preventDefault();
        const start = { x: e.clientX, y: e.clientY };
        let active = false;

        const move = (ev: PointerEvent | MouseEvent) => {
            if (!active) {
                const dx = ev.clientX - start.x;
                const dy = ev.clientY - start.y;
                if (Math.hypot(dx, dy) < MIN_POLL_INTERVAL_MINUTES) return;
                active = true;
            }
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const target = resolveDropTarget(
                el,
                ev.clientX,
                ev.clientY,
                task,
                undefined,
            );
            setDragState({
                task,
                pointerX: ev.clientX,
                pointerY: ev.clientY,
                target,
            });
        };

        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                setInspectorState({ type: "task", id: task.id });
            } else {
                const ds = dragRef.current;
                if (ds && ds.target) {
                    if (ds.target.kind === "grid-day" && ds.target.date) {
                        createEvent(
                            task,
                            ds.target.date,
                            ID_LENGTH * MINUTES_IN_HOUR,
                            task.est || MINUTES_IN_HOUR,
                            true,
                        );
                    } else if (ds.target.kind === "day-time" && ds.target.minute !== undefined) {
                        createEvent(
                            task,
                            ymd(timelineDate),
                            ds.target.minute,
                            task.est || MINUTES_IN_HOUR,
                            false,
                        );
                    }
                }
            }
            setDragState(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const onEventDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, eventToMove: AppEvent, task?: AppTask | null) => {
        const calId = eventToMove.googleCalendarId || "primary";
        const cal = calendars.find((c) => c.id === calId);
        if (cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader")) {
            setInspectorState({ type: "event", id: eventToMove.id });
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        const start = { x: e.clientX, y: e.clientY };
        let active = false;

        const move = (ev: PointerEvent | MouseEvent) => {
            if (!active) {
                const dx = ev.clientX - start.x;
                const dy = ev.clientY - start.y;
                if (Math.hypot(dx, dy) < MIN_POLL_INTERVAL_MINUTES) return;
                active = true;
            }
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const target = resolveDropTarget(
                el,
                ev.clientX,
                ev.clientY,
                task,
                eventToMove,
            );
            setDragState({
                event: eventToMove,
                task,
                pointerX: ev.clientX,
                pointerY: ev.clientY,
                target,
            });
        };

        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                setInspectorState({ type: "event", id: eventToMove.id });
            } else {
                const ds = dragRef.current;
                if (ds && ds.target) {
                    if (ds.target.kind === "grid-day" && ds.target.date) {
                        setEvents((prev: AppEvent[]) =>
                            prev.map((evnt: AppEvent) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ds.target?.date ?? evnt.date,
                                          endDate: ds.target?.date ?? evnt.endDate,
                                      }
                                    : evnt,
                            ),
                        );
                    } else if (ds.target.kind === "day-time" && ds.target.minute !== undefined) {
                        const duration = eventToMove.end - eventToMove.start;
                        setEvents((prev: AppEvent[]) =>
                            prev.map((evnt: AppEvent) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ymd(timelineDate),
                                          endDate: ymd(timelineDate),
                                          start: ds.target?.minute ?? evnt.start,
                                          end: (ds.target?.minute ?? evnt.start) + duration,
                                          isAllDay: false,
                                      }
                                    : evnt,
                            ),
                        );
                    }
                }
            }
            setDragState(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    return { onTaskDragStart, onEventDragStart, dragState, setDragState };
}
