import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext, StopwatchState, ClockDisplayData } from "./types";
import { logWorkSession } from "./utils";
import { PAD2 } from "../../../core/store/data";

export class GuzeyClockStrategy extends ClockStrategy {
    getDisplayData({ state }: StopwatchContext): ClockDisplayData {
        const now = new Date();
        const h = now.getHours();
        const min = now.getMinutes();

        let breakState = "";
        let nextMin = 0;
        let color = "var(--fg)";
        const isLongBreak = h % 3 === 0;

        if (isLongBreak && min < 35) {
            breakState = "LONG_BREAK";
            nextMin = 35;
            color = "var(--tag-green)";
        } else {
            if (min >= 0 && min < 5) {
                breakState = "BREAK";
                nextMin = 5;
                color = "var(--tag-green)";
            } else if (min >= 5 && min < 30) {
                breakState = "WORK";
                nextMin = 30;
                color = "var(--fg)";
            } else if (min >= 30 && min < 35) {
                breakState = "BREAK";
                nextMin = 35;
                color = "var(--tag-green)";
            } else {
                breakState = "WORK";
                nextMin = 60;
                color = "var(--fg)";
            }
        }

        let target = new Date(now);
        target.setSeconds(0);
        target.setMilliseconds(0);
        if (nextMin === 60) {
            target.setMinutes(0);
            target.setHours(target.getHours() + 1);
        } else {
            target.setMinutes(nextMin);
        }

        const remainingMs = target.getTime() - now.getTime();
        const remS = Math.floor(remainingMs / 1000);
        const remM = Math.floor(remS / 60);
        const finalS = remS % 60;

        const isBreakNow = breakState === "BREAK" || breakState === "LONG_BREAK";
        const isPaused = !state.runningSince;

        return {
            primaryText: `${PAD2(remM)}:${PAD2(finalS)}`,
            secondaryText: isPaused ? "TRACKING PAUSED" : breakState,
            color: isPaused ? "var(--fg-dim)" : color,
            isBreak: isBreakNow,
        };
    }

    requiresAnimationLoop() {
        return true;
    }

    onToggle({ setState, setTimeLogs, activeTask }: StopwatchContext) {
        setState((s): StopwatchState => {
            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "guzey",
                );
                return { ...s, runningSince: null };
            } else {
                return { ...s, runningSince: Date.now() };
            }
        });
    }

    onTaskSelected({ setSelectorOpen, setState }: StopwatchContext) {
        setSelectorOpen(false);
        setState((s) => ({ ...s, runningSince: Date.now() }));
    }

    onReset({ setSelectorOpen, setState, setTimeLogs, activeTask, state }: StopwatchContext) {
        if (state.runningSince) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "guzey",
            );
        }
        setState((s) => ({ ...s, runningSince: null }));
        setSelectorOpen(false);
    }
}
