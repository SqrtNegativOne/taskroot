import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { PX_PER_MIN } from "../types";
import { PAD2 } from "../../../core/store/data";
import { useCurrentTime } from "../hooks/useCurrentTime";

export function CurrentTimeLine({ isToday }: { isToday: boolean }) {
    const nowMin = useCurrentTime();

    if (!isToday) return null;

    return (
        <div
            className="day-now"
            style={{ top: `${nowMin * PX_PER_MIN}px` }}
        >
            <span className="day-now-label">
                {PAD2(Math.floor(nowMin / MINUTES_IN_HOUR))}:{PAD2(nowMin % MINUTES_IN_HOUR)}
            </span>
            <div className="day-now-line" />
        </div>
    );
}
