import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import React, { useState, Fragment } from "react";
import { PAD2 } from "../../core/store/data";
import { PX_PER_MIN, SNAP_MIN } from "./types";
import type { EventBlockProps } from "./types";
import type { AppEvent } from "../../core/domain/models";

const MIN_EVENT_HEIGHT_PX = 18;




const EV_WIDTH_PERCENT = 80;

function getEventClassNames(event: AppEvent, pri: string | number | null | undefined, compact: boolean, isGhost: boolean, isFloating: boolean): string {
    const classNames = ["day-event", `ev-${event.type}`];
    if (pri) classNames.push(`pri-bar-${pri}`);
    if (compact) classNames.push("is-compact");
    if (event.isDone) classNames.push("is-done");
    if (isGhost) classNames.push("is-ghost");
    if (isFloating) classNames.push("is-floating");
    return classNames.join(" ");
}

export function EventBlock<T extends import("./types").DragState = import("./types").DragState>({
    event,
    task,
    lane,
    lanes,
    onResize,
    onMove,
    onEventClick,
}: EventBlockProps<T>) {
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
                    Math.min(HOURS_PER_DAY * MINUTES_IN_HOUR, startEnd + dm),
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
        if (!(e.target instanceof Element)) return;
        if (e.target.closest(".day-event-handle")) return;
        if (e.button !== 0) return;
        e.preventDefault();
        const startY = e.clientY;
        const startStart = event.start || 0;
        const startEnd = event.end || 0;
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
        const compact = height < COMPACT_EVENT_HEIGHT_PX;
        
        const classNames = getEventClassNames(event, pri, compact, isGhost, isFloating);

        const style = {
            top: `${top}px`,
            height: `${Math.max(height, MIN_EVENT_HEIGHT_PX)}px`,
            left: `calc(56px + ((100% - 56px) / ${lanes}) * ${lane})`,
            width: `calc(((100% - 56px) / ${lanes}) - 2px)`,
        };

        const hasTags = !compact && event.type === "plan" && task && (task.tags || []).length > 0;

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
                    <div className="day-event-title">
                        {pri !== null && pri !== undefined && (
                            <span className={`pri pri-${pri}`}>●</span>
                        )}
                        {title}
                    </div>
                    <div className="day-event-time">
                        {PAD2(Math.floor(start / MINUTES_IN_HOUR))}:{PAD2(start % MINUTES_IN_HOUR)} –{" "}
                        {PAD2(Math.floor(end / MINUTES_IN_HOUR))}:{PAD2(end % MINUTES_IN_HOUR)}
                    </div>
                    {hasTags && (
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
