import { MS_PER_MINUTE, MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { useState, useEffect } from "react";

export function useCurrentTime() {
    const [nowMin, setNowMin] = useState(() => {
        const d = new Date();
        return d.getHours() * MINUTES_IN_HOUR + d.getMinutes();
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const d = new Date();
            setNowMin(d.getHours() * MINUTES_IN_HOUR + d.getMinutes());
        }, MS_PER_MINUTE);
        return () => clearInterval(interval);
    }, []);

    return nowMin;
}
