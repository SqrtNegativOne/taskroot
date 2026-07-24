import type { AppTask, AppEvent } from "../../core/domain/models";
import { durationLabel } from "../../core/store/data";
import { PX_PER_MIN, SNAP_MIN } from "../../components/day-timeline";

export interface PlanDragTarget {
    kind: string;
    minute?: number;
    duration?: number;
    date?: string;
}

export interface PlanDragState {
    task?: AppTask | null;
    event?: AppEvent | null;
    pointerX: number;
    pointerY: number;
    target: PlanDragTarget | null;
}

export function DragGhost({ task, event, x, y, style }: { task?: AppTask | null, event?: AppEvent | null, x: number, y: number, style: string }) {
    const title = task ? task.title : event ? event.title : "";
    const pri = task ? task.priority : null;
    const est = task ? task.est : event ? event.end - event.start : 60;
    
    return (
        <div
            className={`drag-ghost is-${style}`}
            style={{ left: x + 14, top: y - 8 }}
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

export function resolveDropTarget(el: Element | null, _x: number, y: number, task?: AppTask | null, event?: AppEvent | null): PlanDragTarget | null {
    if (!el) return null;
    // Day calendar grid
    const grid = el.closest('[data-drop-kind="day-time"]') as HTMLElement | null;
    if (grid) {
        const rect = grid.getBoundingClientRect();
        const offsetY = y - rect.top;
        const rawMin = offsetY / PX_PER_MIN;
        const snapped = Math.max(
            0,
            Math.min(
                24 * 60 - SNAP_MIN,
                Math.round(rawMin / SNAP_MIN) * SNAP_MIN,
            ),
        );
        return {
            kind: "day-time",
            minute: snapped,
            duration: task?.est || (event ? event.end - event.start : 60),
        };
    }
    // Date grid day cell
    const day = el.closest('[data-drop-kind="grid-day"]') as HTMLElement | null;
    if (day) {
        return { kind: "grid-day", date: day.dataset.dropDate };
    }
    return null;
}
