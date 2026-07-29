import type { ReadonlyStopwatchContext, ClockActionEffect, ClockDisplayData } from "./types";

export abstract class ClockStrategy {
    abstract getDisplayData(context: ReadonlyStopwatchContext): ClockDisplayData;
    abstract requiresAnimationLoop(context: ReadonlyStopwatchContext): boolean;
    abstract calculateToggle(context: ReadonlyStopwatchContext): ClockActionEffect;
    abstract calculateTaskSelected(context: ReadonlyStopwatchContext): ClockActionEffect;
    abstract calculateReset(context: ReadonlyStopwatchContext): ClockActionEffect;
}
