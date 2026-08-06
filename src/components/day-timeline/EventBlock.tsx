import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import React, { useState, Fragment } from "react";
import { PAD2 } from "../../core/store/data";
import type { EventBlockProps } from "./types";
import { PX_PER_MIN, SNAP_MIN } from "./types";
import type { HydratedEvent } from "../../core/domain/events";
import { Icon } from "../icon";

const MIN_EVENT_HEIGHT_PX = 18;
const COMPACT_EVENT_HEIGHT_PX = 12;
const DRAG_THRESHOLD_PX = 3;
const DEFAULT_LABEL_OFFSET_PX = 56;








const SHORT_EVENT_DURATION_MINS = 30;

function getEventClassNames(
    event: HydratedEvent,
    opts: { compact: boolean; isGhost: boolean; isFloating: boolean; isShort: boolean }
): string {
    const classNames = ["day-event", `ev-${event.type}`];
    if (event.taskId) classNames.push("ev-plan");
    if (event.task?.priority) classNames.push(`pri-bar-${event.task.priority}`);
    if (opts.compact) classNames.push("is-compact");
    if (opts.isShort && !opts.compact) classNames.push("is-short");
    if (event.task?.status === "done") classNames.push("is-done");
    if (opts.isGhost) classNames.push("is-ghost");
    if (opts.isFloating) classNames.push("is-floating");
    return classNames.join(" ");
}

export function EventBlock<T extends import("./types").DragState = import("./types").DragState>({
    event,
    startMins,
    endMins,
    lane,
    lanes,
    onResize,
    onMove,
    onEventClick,
    labelOffset = DEFAULT_LABEL_OFFSET_PX,
}: EventBlockProps<T> & { labelOffset?: number }) {
    const [dragOffset, setDragOffset] = useState<number>();

    const title = event.title;
    const pri = event.task?.priority;

    const onResizeStart = (edge: "top" | "bottom") => (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const startStart = startMins;
        const startEnd = endMins;
        const move = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const dm = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            if (edge === "bottom") {
                const newEnd = Math.max(
                    startStart + SNAP_MIN,
                    Math.min(HOURS_PER_DAY * MINUTES_IN_HOUR, startEnd + dm),
                );
                if (onResize) onResize(event.id, startStart, newEnd);
            } else {
                const newStart = Math.max(
                    0,
                    Math.min(startEnd - SNAP_MIN, startStart + dm),
                );
                if (onResize) onResize(event.id, newStart, startEnd);
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
        if (!(e.target instanceof Element)) return;
        if (e.target.closest(".day-event-handle")) return;
        if (e.button !== 0) return;
        e.preventDefault();
        const startY = e.clientY;
        const startStart = startMins;
        const startEnd = endMins;
        let moved = false;
        let finalDm = 0;
        const move = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            if (!moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
            moved = true;
            const dm = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const minDm = -startStart;
            const maxDm = HOURS_PER_DAY * MINUTES_IN_HOUR - startEnd;
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
            setDragOffset(undefined);
            if (finalDm !== 0 && onMove) {
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

    const isRecurring = Boolean(event.rrule || event.isInstance);

    // eslint-disable-next-line complexity
    const renderBlock = (start: number, end: number, isGhost: boolean, isFloating: boolean) => {
        const top = start * PX_PER_MIN;
        const height = (end - start) * PX_PER_MIN;
        const compact = height < COMPACT_EVENT_HEIGHT_PX;
        const isShort = (end - start) <= SHORT_EVENT_DURATION_MINS;
        
        const classNames = getEventClassNames(event, { compact, isGhost, isFloating, isShort });

        const style: React.CSSProperties = {
            top: `${top}px`,
            height: `${Math.max(height, MIN_EVENT_HEIGHT_PX)}px`,
            left: `calc(${labelOffset}px + ((100% - ${labelOffset}px) / ${lanes}) * ${lane})`,
            width: `calc(((100% - ${labelOffset}px) / ${lanes}) - 2px)`,
        };
        
        if (event.color) {
            style.backgroundColor = event.color;
            style.borderLeftColor = event.color;
        }
        
        let isPastDue = false;
        if (!!event.taskId && event.task?.status !== "done") {
            if (new Date(event.endTime).getTime() < Date.now()) {
                isPastDue = true;
            }
        }



        return (
            <div
                className={classNames}
                style={style}
                onPointerDown={isGhost ? undefined : onBodyDown}
                key={isGhost ? "ghost" : "main"}
            >
                <div
                    className="day-event-handle day-event-handle-top"
                    onPointerDown={isGhost ? undefined : onResizeStart("top")}
                />
                <div className="day-event-inner">
                    <div className="day-event-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isRecurring && (
                            <Icon name="event_repeat" size={14} style={{ flexShrink: 0 }} />
                        )}
                        {isPastDue && (
                            <Icon name="warning" size={14} style={{ flexShrink: 0, color: 'var(--p0)' }} />
                        )}
                        {pri !== undefined && (
                            <span className={`pri pri-${pri}`}>●</span>
                        )}
                        {title}
                    </div>
                    <div className="day-event-time">
                        {PAD2(Math.floor(Math.round(start) / MINUTES_IN_HOUR))}:{PAD2(Math.round(start) % MINUTES_IN_HOUR)} –{" "}
                        {PAD2(Math.floor(Math.round(end) / MINUTES_IN_HOUR))}:{PAD2(Math.round(end) % MINUTES_IN_HOUR)}
                    </div>
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

    if (dragOffset !== undefined) {
        return (
            <Fragment>
                {renderBlock(startMins, endMins, true, false)}
                {renderBlock(
                    startMins + dragOffset,
                    endMins + dragOffset,
                    false,
                    true,
                )}
            </Fragment>
        );
    }
    return renderBlock(startMins, endMins, false, false);
}
