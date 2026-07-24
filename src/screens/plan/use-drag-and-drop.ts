import React, { useState, useRef } from 'react';
import { useEvents, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";
import { resolveDropTarget } from "./drag-helpers";
import type { PlanDragState } from "./drag-helpers";

export function useDragAndDrop(
    timelineDate: Date,
    setInspectorState: React.Dispatch<React.SetStateAction<{ type: string, id: string } | null>>,
    createEvent: (task: AppTask, date: string, start: number, duration: number, isAllDay?: boolean) => void
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
                const dx = (ev as MouseEvent).clientX - start.x;
                const dy = (ev as MouseEvent).clientY - start.y;
                if (Math.hypot(dx, dy) < 5) return;
                active = true;
            }
            const el = document.elementFromPoint((ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
            const target = resolveDropTarget(
                el,
                (ev as MouseEvent).clientX,
                (ev as MouseEvent).clientY,
                task,
                undefined,
            );
            setDragState({
                task,
                pointerX: (ev as MouseEvent).clientX,
                pointerY: (ev as MouseEvent).clientY,
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
                    if (ds.target.kind === "grid-day") {
                        createEvent(
                            task,
                            ds.target!.date!,
                            9 * 60,
                            task.est || 60,
                            true,
                        );
                    } else if (ds.target.kind === "day-time") {
                        createEvent(
                            task,
                            ymd(timelineDate),
                            ds.target!.minute!,
                            task.est || 60,
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

    const onEventDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, _eventToMoveAny: unknown, task?: AppTask | null) => {
        const eventToMove = _eventToMoveAny as AppEvent;
        const calId = eventToMove.googleCalendarId || "primary";
        const cal = calendars.find((c: any) => c.id === calId) as any;
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
                const dx = (ev as MouseEvent).clientX - start.x;
                const dy = (ev as MouseEvent).clientY - start.y;
                if (Math.hypot(dx, dy) < 5) return;
                active = true;
            }
            const el = document.elementFromPoint((ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
            const target = resolveDropTarget(
                el,
                (ev as MouseEvent).clientX,
                (ev as MouseEvent).clientY,
                task,
                eventToMove,
            );
            setDragState({
                event: eventToMove,
                task,
                pointerX: (ev as MouseEvent).clientX,
                pointerY: (ev as MouseEvent).clientY,
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
                    if (ds.target.kind === "grid-day") {
                        setEvents((prev: AppEvent[]) =>
                            prev.map((evnt: AppEvent) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ds.target!.date!,
                                          endDate: ds.target!.date!,
                                      }
                                    : evnt,
                            ),
                        );
                    } else if (ds.target.kind === "day-time") {
                        const duration = eventToMove.end - eventToMove.start;
                        setEvents((prev: AppEvent[]) =>
                            prev.map((evnt: AppEvent) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ymd(timelineDate),
                                          endDate: ymd(timelineDate),
                                          start: ds.target!.minute!,
                                          end: ds.target!.minute! + duration,
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
