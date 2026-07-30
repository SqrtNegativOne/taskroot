import { MINUTES_IN_HOUR, MS_PER_SECOND } from "../../utils/constants";
import type { ClockStrategy } from "./ClockStrategy";
import type { ReadonlyStopwatchContext, ClockDisplayData, ClockActionEffect } from "./types";
import { splitTime } from "./utils";
import { PAD2 } from "../../../core/store/data";

const DEFAULT_FLOWTIME_BREAK_DIVISOR = 5;

export class FlowtimeClockStrategy implements ClockStrategy {
    getDisplayData({ currentMs = 0, isPristine, state }: ReadonlyStopwatchContext): ClockDisplayData {
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

    requiresAnimationLoop({ state }: ReadonlyStopwatchContext) {
        return state.runningSince !== undefined || state.isBreak;
    }

    calculateToggle({ isPristine, activeTask, allowNoTask, state }: ReadonlyStopwatchContext): ClockActionEffect {
        if (isPristine && !activeTask && !allowNoTask) {
            return { selectorOpen: true };
        }
        if (state.isBreak) return {};

        if (state.runningSince) {
            return {
                shouldLogSession: true,
                newState: {
                    elapsed: state.elapsed + (Date.now() - state.runningSince),
                    runningSince: undefined,
                }
            };
        }
        return { newState: { runningSince: Date.now() } };
    }

    calculateTaskSelected({ running, state }: ReadonlyStopwatchContext): ClockActionEffect {
        if (!running && !state.isBreak) {
            return { selectorOpen: false, newState: { runningSince: Date.now() } };
        }
        return { selectorOpen: false };
    }

    calculateReset({ state }: ReadonlyStopwatchContext): ClockActionEffect {
        const effect: ClockActionEffect = {
            selectorOpen: false,
            newState: {
                elapsed: 0,
                runningSince: undefined,
                isBreak: false,
                breakAllowedMs: 0,
                breakStartedAt: undefined,
            }
        };
        if (state.runningSince && !state.isBreak) {
            effect.shouldLogSession = true;
        }
        return effect;
    }

    calculateStartBreak({ state, settings }: ReadonlyStopwatchContext): ClockActionEffect {
        if (state.isBreak) return { newState: { isBreak: false, elapsed: 0, runningSince: Date.now() } };
        
        const effect: ClockActionEffect = {
            newState: {
                isBreak: true,
                breakAllowedMs: (state.elapsed + (state.runningSince ? Date.now() - state.runningSince : 0)) / (settings?.flowtimeBreakDivisor || DEFAULT_FLOWTIME_BREAK_DIVISOR),
                breakStartedAt: Date.now(),
                runningSince: undefined,
                elapsed: 0,
                breakSoundPlayed: false,
            }
        };
        if (state.runningSince) effect.shouldLogSession = true;
        return effect;
    }
}
