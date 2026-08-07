import { MS_PER_SECOND } from "../../../core/utils/constants";
import { expect, test, describe } from "vitest";
import { CLOCK_STRATEGIES } from "../../../core/domain/clock-strategies";
import { createWorkSessionEvent } from "../../../core/domain/clock-strategies/utils";
import type { ReadonlyStopwatchContext } from "../../../core/domain/clock-strategies/types";


function createMockContext(overrides: Partial<ReadonlyStopwatchContext>): ReadonlyStopwatchContext {
    return {
        currentMs: 0,
        running: false,
        isPristine: true,
        state: { runningSince: undefined, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: undefined, breakSoundPlayed: false },

        allowNoTask: false,
        settings: {},
        ...overrides
    };
}

describe("createWorkSessionEvent", () => {
    test("ignores sessions less than 1 minute", () => {
        const ev = createWorkSessionEvent(MS_PER_SECOND, MS_PER_SECOND * 2, "task1", "counter");
        expect(ev).toBeUndefined();
    });

    test("logs sessions 1 minute or longer", () => {
        const ev = createWorkSessionEvent(MS_PER_SECOND, 62000, "task1", "counter");
        expect(ev).not.toBeUndefined();
        expect(ev?.taskId).toBe("task1");
        expect(ev?.["clockStyle"]).toBe("counter");
    });
});

describe("CounterClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES["counter"];

    test("requiresAnimationLoop when running", () => {
        if (!strategy) throw new Error();
        expect(
            strategy.requiresAnimationLoop(createMockContext({ running: true, state: { runningSince: 123, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: undefined, breakSoundPlayed: false } })),
        ).toBe(true);
        expect(
            strategy.requiresAnimationLoop(createMockContext({ running: false, state: { runningSince: undefined, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: undefined, breakSoundPlayed: false } })),
        ).toBe(false);
    });

    test("calculateToggle toggles state", () => {
        if (!strategy) throw new Error();
        // Start
        const effect1 = strategy.calculateToggle(createMockContext({
            isPristine: true,
            activeTask: { id: "t1", title: "Task" },
        }));
        expect(effect1.newState?.runningSince).toBeTypeOf("number");

        // Stop
        const effect2 = strategy.calculateToggle(createMockContext({
            isPristine: false,
            running: true,
            state: { elapsed: 1000, runningSince: 1000, isBreak: false, breakAllowedMs: 0, breakStartedAt: undefined, breakSoundPlayed: false },
            activeTask: { id: "t1", title: "Task" },
        }));
        expect(effect2.newState?.runningSince).toBeUndefined();
    });
});

describe("FlowtimeClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES["flowtime"];

    test("calculateToggle prevents pause during break", () => {
        if (!strategy) throw new Error();
        const effect = strategy.calculateToggle(createMockContext({
            isPristine: false,
            running: false,
            state: { elapsed: 100, runningSince: undefined, isBreak: true, breakAllowedMs: 0, breakStartedAt: 0, breakSoundPlayed: false },
        }));
        expect(effect.newState).toBeUndefined(); // Should return no state modifications
    });
});

describe("GuzeyClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES["guzey"];

    test("requiresAnimationLoop is true", () => {
        if (!strategy) throw new Error();
        expect(strategy.requiresAnimationLoop(createMockContext({ running: true, state: { runningSince: 1000, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: undefined, breakSoundPlayed: false } }))).toBe(true);
    });
});
