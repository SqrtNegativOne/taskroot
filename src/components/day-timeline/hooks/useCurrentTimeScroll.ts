import { useEffect, useRef } from "react";
import { PX_PER_MIN } from "../types";
import { useSettings } from "../../../core/store/hooks";
import { DEFAULT_SETTINGS } from "../../../core/store/settingsSchema";

export const MONTHS_IN_YEAR = 12;

export function useCurrentTimeScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [settings] = useSettings();

    useEffect(() => {
        const tick = () => {
            if (scrollRef.current) {
                const startMin = settings.dayTimelineStartView ?? DEFAULT_SETTINGS.dayTimelineStartView;
                (scrollRef.current instanceof HTMLElement ? scrollRef.current : { scrollTop: 0 }).scrollTop = Math.max(
                    0,
                    startMin * PX_PER_MIN,
                );
            }
        };
        tick();
        const id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, [settings.dayTimelineStartView]);

    return scrollRef;
}
