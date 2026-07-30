
import { CLOCK_STRATEGIES } from "../../core/domain/clock-strategies";
import type { StopwatchState } from "../../core/domain/clock-strategies/types";
import type { ReadonlyStopwatchContext } from "../../core/domain/clock-strategies";

interface MiniTrackerClockProps {
    activeTask: { title: string } | undefined | null;
    allowStopwatchWithoutTask: boolean;
    clockStyle: string;
    currentMs: number;
    state: StopwatchState;
    running: boolean;
}

export function MiniTrackerClock({
    activeTask,
    allowStopwatchWithoutTask,
    clockStyle,
    currentMs,
    state,
    running
}: MiniTrackerClockProps) {
    if (!activeTask && !allowStopwatchWithoutTask) {
        return <div style={{ color: "var(--fg-dim)" }}>No active task.</div>;
    }
    
    const taskName = activeTask ? activeTask.title : "Work session";
    const strategy = CLOCK_STRATEGIES[clockStyle] || CLOCK_STRATEGIES.counter;
    
    const optionsObj: ReadonlyStopwatchContext = {
        currentMs,
        running,
        state,
        isPristine: false,
    };
    const data = strategy.getDisplayData(optionsObj);

    if (data.secondaryText === "TRACKING PAUSED") {
        return <div style={{ color: data.color }}>TRACKING PAUSED</div>;
    }

    let suffix = taskName;
    if (data.secondaryText === "BREAK" || data.secondaryText === "LONG_BREAK") {
        suffix = "left in break";
    } else if (data.secondaryText === "WORK") {
        suffix = `left for ${taskName}`;
    }

    return (
        <div style={{ color: data.color || "inherit" }}>
            <span style={{ fontWeight: "normal" }}>{data.primaryText}</span>
            {" "}
            {suffix}
        </div>
    );
}
