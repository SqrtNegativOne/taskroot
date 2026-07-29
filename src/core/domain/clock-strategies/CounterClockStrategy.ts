import { ClockStrategy } from "./ClockStrategy";
import type { ReadonlyStopwatchContext, ClockDisplayData, ClockActionEffect } from "./types";
import { splitTime } from "./utils";

export class CounterClockStrategy extends ClockStrategy {
    getDisplayData({ currentMs = 0, isPristine }: ReadonlyStopwatchContext): ClockDisplayData {
        const { m } = splitTime(currentMs);
        return {
            primaryText: m,
            showPlayIcon: isPristine,
        };
    }

    requiresAnimationLoop({ state }: ReadonlyStopwatchContext) {
        return state.runningSince !== undefined;
    }

    calculateToggle({ isPristine, activeTask, allowNoTask, state }: ReadonlyStopwatchContext): ClockActionEffect {
        if (isPristine && !activeTask && !allowNoTask) {
            return { selectorOpen: true };
        }
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

    calculateTaskSelected({ running }: ReadonlyStopwatchContext): ClockActionEffect {
        if (!running) {
            return { selectorOpen: false, newState: { runningSince: Date.now() } };
        }
        return { selectorOpen: false };
    }

    calculateReset({ state }: ReadonlyStopwatchContext): ClockActionEffect {
        const effect: ClockActionEffect = {
            selectorOpen: false,
            newState: { elapsed: 0, runningSince: undefined }
        };
        if (state.runningSince) {
            effect.shouldLogSession = true;
        }
        return effect;
    }
}
