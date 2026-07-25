import { useState, useEffect } from "react";

export function useCurrentTime() {
    const [nowMin, setNowMin] = useState(() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const d = new Date();
            setNowMin(d.getHours() * 60 + d.getMinutes());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return nowMin;
}
