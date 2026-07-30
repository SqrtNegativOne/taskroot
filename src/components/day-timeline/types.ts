import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import type { HydratedEvent } from "../../core/domain/events";
import type { AppTask, AppFilter } from "../../core/domain/models";

export const PIXELS_PER_HOUR = 56;


export const PX_PER_MIN = PIXELS_PER_HOUR / MINUTES_IN_HOUR; // 56 px per hour
export const SNAP_MIN = 15;

export interface DragStateTarget {
    kind: string;
    minute?: number;
    duration?: number;
    date?: string;
    start?: number;
    end?: number;
}

export interface DragState {
    target?: DragStateTarget;
    event?: unknown;
}

export interface DayTimelineProps<T extends DragState = DragState> {
    events: HydratedEvent[];
    filter?: AppFilter[];
    sort?: string;
    filterMenu?: React.ReactNode;
    today: Date;
    timelineDate: Date;
    setTimelineDate: (d: Date) => void;
    dragState?: T;
    setDragState: React.Dispatch<React.SetStateAction<T | undefined>>;
    onDropToTime?: (e: unknown) => void;
    onResizeEvent: (id: string, start: number, end: number) => void;
    onMoveEvent: (id: string, start: number, end: number) => void;
    onEventClick?: (e: HydratedEvent) => void;
    onAddEvent?: (d: Date, start: number, end: number) => void;
}

export interface EventBlockProps<T extends DragState = DragState> {
    event: HydratedEvent;
    task?: AppTask;
    lane: number;
    lanes: number;
    onResize?: (id: string, start: number, end: number) => void;
    onMove?: (id: string, start: number, end: number) => void;
    dragState?: T;
    setDragState?: (s: T | undefined) => void;
    onEventClick?: (e: HydratedEvent) => void;
}
