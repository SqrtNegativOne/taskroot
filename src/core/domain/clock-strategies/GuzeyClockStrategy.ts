import { MINUTES_IN_HOUR, MS_PER_SECOND } from "../../utils/constants";
import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext, StopwatchState, ClockDisplayData } from "./types";
import { logWorkSession } from "./utils";
import { PAD2 } from "../../../core/store/data";

export const POMODORO_LONG_BREAK_THRESHOLD = 35;
export const POMODORO_BREAK_THRESHOLD = 30;
export const MIN_POLL_INTERVAL_MINUTES = 5;
export const MAX_RETRIES = 3;


export class GuzeyClockStrategy extends ClockStrategy {
    getDisplayData({ state }: StopwatchContext): ClockDisplayData {
        const now = new Date();
        const h = now.getHours();
        const min = now.getMinutes();

        let breakState = "";
        let nextMin = 0;
        let color = "var(--fg)";
        const isLongBreak = h % MAX_RETRIES === 0;

        if (isLongBreak && min < POMODORO_LONG_BREAK_THRESHOLD) {
            breakState = "LONG_BREAK";
            nextMin = POMODORO_LONG_BREAK_THRESHOLD;
            color = "var(--tag-green)";
        } else {
            if (min >= 0 && min < MIN_POLL_INTERVAL_MINUTES) {
                breakState = "BREAK";
                nextMin = MIN_POLL_INTERVAL_MINUTES;
                color = "var(--tag-green)";
            } else if (min >= MIN_POLL_INTERVAL_MINUTES && min < POMODORO_BREAK_THRESHOLD) {
                breakState = "WORK";
                nextMin = POMODORO_BREAK_THRESHOLD;
                color = "var(--fg)";
            } else if (min >= POMODORO_BREAK_THRESHOLD && min < POMODORO_LONG_BREAK_THRESHOLD) {
                breakState = "BREAK";
                nextMin = POMODORO_LONG_BREAK_THRESHOLD;
                color = "var(--tag-green)";
            } else {
                breakState = "WORK";
                nextMin = MINUTES_IN_HOUR;
                color = "var(--fg)";
            }
        }

        let target = new Date(now);
        target.setSeconds(0);
        target.setMilliseconds(0);
        if (nextMin === MINUTES_IN_HOUR) {
            target.setMinutes(0);
            target.setHours(target.getHours() + 1);
        } else {
            target.setMinutes(nextMin);
        }

        const remainingMs = target.getTime() - now.getTime();
        const remS = Math.floor(remainingMs / MS_PER_SECOND);
        const remM = Math.floor(remS / MINUTES_IN_HOUR);
        const finalS = remS % MINUTES_IN_HOUR;

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
