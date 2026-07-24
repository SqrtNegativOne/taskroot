import React from "react";
import { StopwatchContext } from "./types";

export abstract class ClockStrategy {
    abstract renderDisplay(context: StopwatchContext): React.ReactNode;
    abstract requiresAnimationLoop(context: StopwatchContext): boolean;
    abstract onToggle(context: StopwatchContext): void;
    abstract onTaskSelected(context: StopwatchContext): void;
    abstract onReset(context: StopwatchContext): void;
}
