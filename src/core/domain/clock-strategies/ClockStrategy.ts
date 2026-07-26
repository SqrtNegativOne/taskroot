import type { StopwatchContext, ClockDisplayData } from "./types";

export abstract class ClockStrategy {
    abstract getDisplayData(context: StopwatchContext): ClockDisplayData;
    abstract requiresAnimationLoop(context: StopwatchContext): boolean;
    abstract onToggle(context: StopwatchContext): void;
    abstract onTaskSelected(context: StopwatchContext): void;
    abstract onReset(context: StopwatchContext): void;
}
