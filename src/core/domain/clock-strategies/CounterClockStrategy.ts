import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext, ClockDisplayData } from "./types";
import { logWorkSession, splitTime } from "./utils";

export class CounterClockStrategy extends ClockStrategy {
    getDisplayData({ currentMs = 0, isPristine }: StopwatchContext): ClockDisplayData {
        const { m } = splitTime(currentMs);
        return {
            primaryText: m,
            showPlayIcon: isPristine,
        };
    }

    requiresAnimationLoop({ state }: StopwatchContext) {
        return state.runningSince != null;
    }

    onToggle({
        isPristine,
        setSelectorOpen,
        setState,
        setTimeLogs,
        activeTask,
        allowNoTask,
    }: StopwatchContext) {
        if (isPristine && !activeTask && !allowNoTask) {
            setSelectorOpen(true);
            return;
        }
        setState((s) => {
            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "counter",
                );
                return {
                    ...s,
                    elapsed: s.elapsed + (Date.now() - s.runningSince),
                    runningSince: null,
                };
            }
            return { ...s, runningSince: Date.now() };
        });
    }

    onTaskSelected({ running, setState, setSelectorOpen }: StopwatchContext) {
        setSelectorOpen(false);
        if (!running) {
            setState((s) => ({ ...s, runningSince: Date.now() }));
        }
    }

    onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }: StopwatchContext) {
        if (state.runningSince) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "counter",
            );
        }
        setState((s) => ({ ...s, elapsed: 0, runningSince: null }));
        setSelectorOpen(false);
    }
}
