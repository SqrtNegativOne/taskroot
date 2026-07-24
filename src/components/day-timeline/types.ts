import type { HydratedEvent, AppEvent } from "../../core/domain/events";
import type { AppTask, AppFilter } from "../../core/domain/models";

export const PX_PER_MIN = 56 / 60; // 56 px per hour
export const SNAP_MIN = 15;

export interface DragStateTarget {
    kind: string;
    minute: number;
    duration?: number;
}

export interface DragState {
    target: DragStateTarget | null;
}

export interface DayTimelineProps {
    events: AppEvent[];
    tasks: AppTask[];
    filter?: AppFilter[];
    sort?: string;
    filterMenu?: React.ReactNode;
    today: Date;
    timelineDate: Date;
    setTimelineDate: (d: Date) => void;
    dragState: DragState | null;
    setDragState: React.Dispatch<React.SetStateAction<DragState | null>>;
    onDropToTime?: (e: unknown) => void;
    onResizeEvent: (id: string, start: number, end: number) => void;
    onMoveEvent: (id: string, start: number, end: number) => void;
    onEventClick?: (e: HydratedEvent) => void;
    onAddEvent?: (d: Date, start: number, end: number) => void;
}

export interface EventBlockProps {
    event: HydratedEvent;
    task?: AppTask;
    lane: number;
    lanes: number;
    onResize: (id: string, start: number, end: number) => void;
    onMove: (id: string, start: number, end: number) => void;
    dragState?: DragState | null;
    setDragState?: React.Dispatch<React.SetStateAction<DragState | null>>;
    onEventClick?: (e: HydratedEvent) => void;
}
