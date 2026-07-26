import { ClockStrategy } from "./ClockStrategy";
import { CounterClockStrategy } from "./CounterClockStrategy";
import { FlowtimeClockStrategy } from "./FlowtimeClockStrategy";
import { GuzeyClockStrategy } from "./GuzeyClockStrategy";

export const CLOCK_STRATEGIES: Record<string, ClockStrategy> = {
    counter: new CounterClockStrategy(),
    flowtime: new FlowtimeClockStrategy(),
    guzey: new GuzeyClockStrategy(),
};
