import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { useEffect, useRef } from "react";
import { PX_PER_MIN } from "../types";

export const MONTHS_IN_YEAR = 12;


export function useCurrentTimeScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tick = () => {
            if (scrollRef.current) {
                const currentMin = new Date().getHours() * MINUTES_IN_HOUR + new Date().getMinutes();
                (scrollRef.current instanceof HTMLElement ? scrollRef.current : { scrollTop: 0 }).scrollTop = Math.max(
                    0,
                    (currentMin - MINUTES_IN_HOUR) * PX_PER_MIN - MONTHS_IN_YEAR,
                );
            }
        };
        tick();
        const id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, []);

    return scrollRef;
}
