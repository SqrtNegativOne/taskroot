import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { memo } from "react";
import { PX_PER_MIN } from "../types";
import { PAD2 } from "../../../core/store/data";
import { useCurrentTime } from "../hooks/useCurrentTime";

export const GUTTER_SIZE_MINUTES = 15;


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
                        top: `${h * MINUTES_IN_HOUR * PX_PER_MIN}px`,
                        height: `${MINUTES_IN_HOUR * PX_PER_MIN}px`,
                    }}
                >
                    <span
                        className="day-hour-label"
                        style={{
                            opacity: isToday && Math.abs(h * MINUTES_IN_HOUR - nowMin) < GUTTER_SIZE_MINUTES ? 0 : 1,
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
