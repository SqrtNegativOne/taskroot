// @ts-nocheck
import { expect, test, describe, vi } from "vitest";
import { logWorkSession, CLOCK_STRATEGIES } from "./stopwatch";
import type { AppTask } from "../../core/domain/models";
import type { TimeLog } from "../../core/store/repositories";
import type { Dispatch, SetStateAction } from "react";

type MockStopwatchContext = Parameters<typeof CLOCK_STRATEGIES.counter.onToggle>[0];

// We use `as` here to easily create mock contexts for testing without implementing every method.
function createMockContext(overrides: Partial<MockStopwatchContext>): MockStopwatchContext {
    return {
        currentMs: 0,
        running: false,
        isPristine: true,
        toggle: vi.fn(),
        state: { runningSince: null, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false },
        setState: vi.fn(),
        timeLogs: [],
        setTimeLogs: vi.fn(),
        setSelectorOpen: vi.fn(),
        selectorOpen: false,
        activeTask: null,
        allowNoTask: false,
        settings: {},
        onBreakStatus: undefined,
        ...overrides
    } as unknown as MockStopwatchContext;
}

describe("logWorkSession", () => {
    test("ignores sessions less than 1 minute", () => {
        const setTimeLogs = vi.fn();
        logWorkSession(setTimeLogs as unknown as Dispatch<SetStateAction<TimeLog[]>>, 1000, 2000, "task1", "counter");
        expect(setTimeLogs).not.toHaveBeenCalled();
    });

    test("logs sessions 1 minute or longer", () => {
        const setTimeLogs = vi.fn((updater: unknown) => updater([]));
        logWorkSession(setTimeLogs as unknown as Dispatch<SetStateAction<TimeLog[]>>, 1000, 62000, "task1", "counter");
        expect(setTimeLogs).toHaveBeenCalled();
        const result = setTimeLogs.mock.results[0].value;
        expect(result.length).toBe(1);
        expect(result[0].taskId).toBe("task1");
        expect(result[0].clockStyle).toBe("counter");
    });
});

describe("CounterClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES.counter;

    test("requiresAnimationLoop when running", () => {
        expect(
            strategy.requiresAnimationLoop(createMockContext({ state: { runningSince: 123, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } })),
        ).toBe(true);
        expect(
            strategy.requiresAnimationLoop(createMockContext({ state: { runningSince: null, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } })),
        ).toBe(false);
    });

    test("onToggle toggles state", () => {
        const setState = vi.fn((updater: unknown) =>
            updater({ elapsed: 0, runningSince: null }),
        );
        const setSelectorOpen = vi.fn();

        // Start
        strategy.onToggle(createMockContext({
            isPristine: true,
            setSelectorOpen,
            setState,
            activeTask: { id: "t1", title: "Task" } as AppTask,
        }));

        expect(setState).toHaveBeenCalled();
        const stateResult = setState.mock.results[0].value;
        expect(stateResult.runningSince).toBeTypeOf("number");

        // Stop
        const setState2 = vi.fn((updater: unknown) =>
            updater({ elapsed: 1000, runningSince: 1000 }),
        );
        const setTimeLogs = vi.fn();
        strategy.onToggle(createMockContext({
            isPristine: false,
            setSelectorOpen,
            setState: setState2,
            setTimeLogs,
            activeTask: { id: "t1", title: "Task" } as AppTask,
        }));

        const stateResult2 = setState2.mock.results[0].value;
        expect(stateResult2.runningSince).toBeNull();
    });
});

describe("FlowtimeClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES.flowtime;

    test("onToggle prevents pause during break", () => {
        const setState = vi.fn((updater: unknown) =>
            updater({ elapsed: 100, runningSince: null, isBreak: true }),
        );
        strategy.onToggle(createMockContext({
            isPristine: false,
            setState,
        }));

        const stateResult = setState.mock.results[0].value;
        expect(stateResult.isBreak).toBe(true); // Should return unmodified state
    });
});

describe("GuzeyClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES.guzey;

    test("requiresAnimationLoop is false", () => {
        expect(strategy.requiresAnimationLoop(createMockContext({ state: { runningSince: 1000, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } }))).toBe(false);
    });
});

