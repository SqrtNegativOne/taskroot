import { MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { durationLabel } from "../../core/store/data";
import { PX_PER_MIN, SNAP_MIN } from "../../components/day-timeline";

export const MAX_RECURRENCES = 8;
export const FONT_SIZE_SMALL = 14;


export interface PlanDragTarget {
    kind: string;
    minute?: number;
    duration?: number;
    date?: import("../../core/domain/models").DateString;
}

export interface PlanDragState {
    task?: AppTask | null;
    event?: AppEvent | null;
    pointerX: number;
    pointerY: number;
    target: PlanDragTarget | null;
}

export function DragGhost({ task, event, x, y, ghostStyle }: { task?: AppTask | null, event?: AppEvent | null, x: number, y: number, ghostStyle: string }) {
    const title = task ? task.title : event ? event.title : "";
    const pri = task ? task.priority : null;
    const est = task ? task.est : event ? event.end - event.start : MINUTES_IN_HOUR;
    
    return (
        <div
            className={`drag-ghost is-${ghostStyle}`}
            style={{ left: x + FONT_SIZE_SMALL, top: y - MAX_RECURRENCES }}
        >
            <div className="drag-ghost-inner">
                {pri !== null && pri !== undefined && (
                    <div
                        className={`task-circle pri-bg-${pri}`}
                        aria-label={String(pri)}
                    />
                )}
                <span className="drag-ghost-title">{title}</span>
            </div>
            <div className="drag-ghost-meta">
                <span className="bracket">└</span> {durationLabel(est)} block
            </div>
        </div>
    );
}

function isDateString(s: string | undefined): s is import("../../core/domain/models").DateString {
    return typeof s === "string" && /^\d+-\d+-\d+$/.test(s);
}

export function resolveDropTarget(el: Element | null, _x: number, y: number, task?: AppTask | null, event?: AppEvent | null): PlanDragTarget | null {
    if (!el) return null;
    // Day calendar grid
    const grid = el.closest('[data-drop-kind="day-time"]');
    if (grid) {
        const rect = grid.getBoundingClientRect();
        const offsetY = y - rect.top;
        const rawMin = offsetY / PX_PER_MIN;
        const snapped = Math.max(
            0,
            Math.min(
                HOURS_PER_DAY * MINUTES_IN_HOUR - SNAP_MIN,
                Math.round(rawMin / SNAP_MIN) * SNAP_MIN,
            ),
        );
        return {
            kind: "day-time",
            minute: snapped,
            duration: task?.est || (event ? event.end - event.start : MINUTES_IN_HOUR),
        };
    }
    // Date grid day cell
    const day = el.closest('[data-drop-kind="grid-day"]');
    if (day instanceof HTMLElement) {
        const dropDate = day.dataset.dropDate;
        if (isDateString(dropDate)) {
            return { kind: "grid-day", date: dropDate };
        }
    }
    return null;
}
