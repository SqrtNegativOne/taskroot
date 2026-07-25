import { TODAY, minutesToHHMM } from "../../core/store/data";
import { DayTimeline } from "../../components/day-timeline";
import type { HydratedEvent } from "../../core/domain/events";
import "./wrap.css";

interface WrapTimelineStepProps {
    logEvents: HydratedEvent[];
    untrackedTime: number;
    wake: number;
    sleep: number;
    isActive: boolean;
    onContinue: () => void;
}

export function WrapTimelineStep({
    logEvents,
    untrackedTime,
    wake,
    sleep,
    isActive,
    onContinue,
}: WrapTimelineStepProps) {
    return (
        <div className="wrap-step-container">
            <div className="wrap-timeline-wrapper">
                <DayTimeline
                    events={logEvents}
                    today={TODAY}
                    timelineDate={TODAY}
                    setTimelineDate={() => {}}
                    dragState={null}
                    setDragState={() => {}}
                    onResizeEvent={() => {}}
                    onMoveEvent={() => {}}
                    onEventClick={() => {}}
                    onAddEvent={() => {}}
                    onDropToTime={() => {}}
                    filter={[]}
                    sort="time"
                    filterMenu={null}
                />
            </div>
            <p className="wrap-timeline-text">
                Time untracked today: {Math.floor(untrackedTime / 60)}h{" "}
                {untrackedTime % 60}m (from {minutesToHHMM(wake)} to{" "}
                {minutesToHHMM(sleep)})
            </p>
            {isActive && (
                <button className="wrap-button" onClick={onContinue}>
                    Continue
                </button>
            )}
        </div>
    );
}
