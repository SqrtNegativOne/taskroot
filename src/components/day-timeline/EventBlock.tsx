import React, { useState, Fragment } from "react";
import { PAD2 } from "../../core/store/data";
import { PX_PER_MIN, SNAP_MIN } from "./types";
import type { EventBlockProps } from "./types";

export function EventBlock({
    event,
    task,
    lane,
    lanes,
    onResize,
    onMove,
    onEventClick,
}: EventBlockProps) {
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
                    Math.min(24 * 60, startEnd + dm),
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
        if ((e.target as Element).closest(".day-event-handle")) return;
        if (e.button !== 0) return;
        e.preventDefault();
        const startY = e.clientY;
        const startStart = event.start || 0;
        const startEnd = event.end || 0;
        let moved = false;
        let finalDm = 0;
        const move = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            if (!moved && Math.abs(dy) < 4) return;
            moved = true;
            const dm = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const minDm = -startStart;
            const maxDm = 24 * 60 - startEnd;
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
        const compact = height < 40;
        const isDone = event.isDone;

        return (
            <div
                className={`day-event ev-${event.type} ${pri ? `pri-bar-${pri}` : ""} ${compact ? "is-compact" : ""} ${isDone ? "is-done" : ""} ${isGhost ? "is-ghost" : ""} ${isFloating ? "is-floating" : ""}`}
                style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 18)}px`,
                    left: `calc(56px + ((100% - 56px) / ${lanes}) * ${lane})`,
                    width: `calc(((100% - 56px) / ${lanes}) - 2px)`,
                }}
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
                        {PAD2(Math.floor(start / 60))}:{PAD2(start % 60)} –{" "}
                        {PAD2(Math.floor(end / 60))}:{PAD2(end % 60)}
                    </div>
                    {!compact &&
                        event.type === "plan" &&
                        task &&
                        (task.tags || []).length > 0 && (
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
