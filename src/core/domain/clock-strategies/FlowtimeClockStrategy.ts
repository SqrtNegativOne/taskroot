import { MINUTES_IN_HOUR, MS_PER_SECOND } from "../../utils/constants";
import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext, ClockDisplayData } from "./types";
import { logWorkSession, splitTime } from "./utils";
import { PAD2 } from "../../../core/store/data";

export class FlowtimeClockStrategy extends ClockStrategy {
    getDisplayData({ currentMs = 0, isPristine, state }: StopwatchContext): ClockDisplayData {
        if (state.isBreak && state.breakStartedAt) {
            const breakRemainingMs = state.breakAllowedMs - (Date.now() - state.breakStartedAt);
            const remSecs = Math.max(0, Math.ceil(breakRemainingMs / MS_PER_SECOND));
            const remM = Math.floor(remSecs / MINUTES_IN_HOUR);
            const remS = remSecs % MINUTES_IN_HOUR;
            const color = remSecs === 0 ? "var(--red)" : "var(--tag-green)";
            
            return {
                primaryText: `${PAD2(remM)}:${PAD2(remS)}`,
                secondaryText: "BREAK",
                color,
            };
        }
        
        const { m } = splitTime(currentMs);
        return {
            primaryText: m,
            showPlayIcon: isPristine,
        };
    }

    requiresAnimationLoop({ state }: StopwatchContext) {
        return state.runningSince != null || state.isBreak;
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
            if (s.isBreak) return s; // can't pause in break (feature not a bug)

            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "flowtime",
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

    onTaskSelected({ running, setState, setSelectorOpen, state }: StopwatchContext) {
        setSelectorOpen(false);
        if (!running && !state.isBreak) {
            setState((s) => ({ ...s, runningSince: Date.now() }));
        }
    }

    onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }: StopwatchContext) {
        if (state.runningSince && !state.isBreak) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "flowtime",
            );
        }
        setState((s) => ({
            ...s,
            elapsed: 0,
            runningSince: null,
            isBreak: false,
            breakAllowedMs: 0,
            breakStartedAt: null,
        }));
        setSelectorOpen(false);
    }
}
