import { useEffect, useRef } from "react";
import { PX_PER_MIN } from "../types";

export function useCurrentTimeScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tick = () => {
            if (scrollRef.current) {
                const currentMin = new Date().getHours() * 60 + new Date().getMinutes();
                (scrollRef.current instanceof HTMLElement ? scrollRef.current : { scrollTop: 0 }).scrollTop = Math.max(
                    0,
                    (currentMin - 60) * PX_PER_MIN - 12,
                );
            }
        };
        tick();
        const id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, []);

    return scrollRef;
}
