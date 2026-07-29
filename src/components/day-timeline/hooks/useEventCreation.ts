import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { useState, useRef, useCallback } from "react";
import { PX_PER_MIN, SNAP_MIN } from "../types";

export function useEventCreation(
    timelineDate: Date,
    onAddEvent?: (d: Date, start: number, end: number) => void
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [createPreview, setCreatePreview] = useState<{ start: number; end: number } | null>(null);

    const onGridPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!(e.target instanceof Element)) return;
        if (e.target.closest(".day-event") || e.target.closest(".day-now")) return;
        if (e.button !== 0) return;
        e.preventDefault();

        const grid = containerRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const startY = e.clientY - rect.top;
        const startMin = Math.round(startY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;

        let active = false;

        const move = (ev: PointerEvent) => {
            active = true;
            const currentY = ev.clientY - rect.top;
            const moveMin = Math.round(currentY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const s = Math.min(startMin, moveMin);
            const eMin = Math.max(startMin, moveMin);
            setCreatePreview({
                start: s,
                end: eMin === s ? s + SNAP_MIN : eMin,
            });
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                if (onAddEvent) {
                    onAddEvent(timelineDate, startMin, startMin + MINUTES_IN_HOUR);
                }
                return;
            }
            const currentY = ev.clientY - rect.top;
            const moveMin = Math.round(currentY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
            const s = Math.min(startMin, moveMin);
            const eMin = Math.max(startMin, moveMin);
            const finalEnd = eMin === s ? s + SNAP_MIN : eMin;
            setCreatePreview(null);
            if (onAddEvent) {
                onAddEvent(timelineDate, s, finalEnd);
            }
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }, [timelineDate, onAddEvent]);

    return { containerRef, createPreview, onGridPointerDown };
}
