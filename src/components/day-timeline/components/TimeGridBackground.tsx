import { memo } from "react";
import { PX_PER_MIN } from "../types";
import { PAD2 } from "../../../core/store/data";
import { useCurrentTime } from "../hooks/useCurrentTime";

interface TimeGridBackgroundProps {
    isToday: boolean;
}

export const TimeGridBackground = memo(function TimeGridBackground({
    isToday,
}: TimeGridBackgroundProps) {
    const nowMin = useCurrentTime();

    return (
        <>
            {Array.from({ length: 24 }, (_, h) => (
                <div
                    key={h}
                    className="day-hour"
                    style={{
                        top: `${h * 60 * PX_PER_MIN}px`,
                        height: `${60 * PX_PER_MIN}px`,
                    }}
                >
                    <span
                        className="day-hour-label"
                        style={{
                            opacity: isToday && Math.abs(h * 60 - nowMin) < 15 ? 0 : 1,
                        }}
                    >
                        {PAD2(h)}:00
                    </span>
                    <div className="day-hour-line" />
                    <div className="day-hour-half" />
                </div>
            ))}
        </>
    );
});
