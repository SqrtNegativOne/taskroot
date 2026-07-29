import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { durationLabel } from "../../core/store/data";

const MAX_RECURRENCES = 8;
const FONT_SIZE_SMALL = 14;


export interface PlanDragTarget {
    kind: string;
    minute?: number;
    duration?: number;
    date?: import("../../core/domain/models").DateString;
}

export interface PlanDragState {
    task?: AppTask;
    event?: AppEvent;
    pointerX: number;
    pointerY: number;
    target?: PlanDragTarget;
}

export function DragGhost({ task, event, x, y, ghostStyle }: { task?: AppTask, event?: AppEvent, x: number, y: number, ghostStyle: string }) {
    const title = task ? task.title : event ? event.title : "";
    const pri = task ? task.priority : undefined;
    const est = task ? task.est : event ? event.end - event.start : MINUTES_IN_HOUR;
    
    return (
        <div
            className={`drag-ghost is-${ghostStyle}`}
            style={{ left: x + FONT_SIZE_SMALL, top: y - MAX_RECURRENCES }}
        >
            <div className="drag-ghost-inner">
                {pri !== undefined && (
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




