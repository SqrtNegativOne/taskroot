import type { ReadonlyStopwatchContext, ClockActionEffect, ClockDisplayData } from "./types";

export interface ClockStrategy {
    getDisplayData(context: ReadonlyStopwatchContext): ClockDisplayData;
    requiresAnimationLoop(context: ReadonlyStopwatchContext): boolean;
    calculateToggle(context: ReadonlyStopwatchContext): ClockActionEffect;
    calculateTaskSelected(context: ReadonlyStopwatchContext): ClockActionEffect;
    calculateReset(context: ReadonlyStopwatchContext): ClockActionEffect;
    calculateStartBreak?(context: ReadonlyStopwatchContext): ClockActionEffect;
}
