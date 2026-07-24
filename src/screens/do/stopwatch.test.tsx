import { expect, test, describe, vi } from "vitest";
import { logWorkSession, CLOCK_STRATEGIES } from "./stopwatch";

describe("logWorkSession", () => {
    test("ignores sessions less than 1 minute", () => {
        const setTimeLogs = vi.fn();
        logWorkSession(setTimeLogs, 1000, 2000, "task1", "counter");
        expect(setTimeLogs).not.toHaveBeenCalled();
    });

    test("logs sessions 1 minute or longer", () => {
        const setTimeLogs = vi.fn((updater) => updater([]));
        logWorkSession(setTimeLogs, 1000, 62000, "task1", "counter");
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
            strategy.requiresAnimationLoop({ state: { runningSince: 123, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } }),
        ).toBe(true);
        expect(
            strategy.requiresAnimationLoop({ state: { runningSince: null, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } }),
        ).toBe(false);
    });

    test("onToggle toggles state", () => {
        const setState = vi.fn((updater) =>
            updater({ elapsed: 0, runningSince: null }),
        );
        const setSelectorOpen = vi.fn();

        // Start
        strategy.onToggle({
            isPristine: true,
            setSelectorOpen,
            setState,
            timeLogs: [],
            setTimeLogs: vi.fn(),
            activeTask: { id: "t1", title: "Task" },
            allowNoTask: false,
            settings: {},
        });

        expect(setState).toHaveBeenCalled();
        const stateResult = setState.mock.results[0].value;
        expect(stateResult.runningSince).toBeTypeOf("number");

        // Stop
        const setState2 = vi.fn((updater) =>
            updater({ elapsed: 1000, runningSince: 1000 }),
        );
        const setTimeLogs = vi.fn();
        strategy.onToggle({
            isPristine: false,
            setSelectorOpen,
            setState: setState2,
            timeLogs: [],
            setTimeLogs,
            activeTask: { id: "t1", title: "Task" },
            allowNoTask: false,
            settings: {},
        });

        const stateResult2 = setState2.mock.results[0].value;
        expect(stateResult2.runningSince).toBeNull();
    });
});

describe("FlowtimeClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES.flowtime;

    test("onToggle prevents pause during break", () => {
        const setState = vi.fn((updater) =>
            updater({ elapsed: 100, runningSince: null, isBreak: true }),
        );
        strategy.onToggle({
            isPristine: false,
            setSelectorOpen: vi.fn(),
            setState,
            timeLogs: [],
            setTimeLogs: vi.fn(),
            activeTask: { id: "t1", title: "Task" },
            allowNoTask: false,
            settings: {},
        });

        const stateResult = setState.mock.results[0].value;
        expect(stateResult.isBreak).toBe(true); // Should return unmodified state
    });
});

describe("GuzeyClockStrategy", () => {
    const strategy = CLOCK_STRATEGIES.guzey;

    test("requiresAnimationLoop is false", () => {
        expect(strategy.requiresAnimationLoop({ state: { runningSince: 1000, elapsed: 0, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false } })).toBe(false);
    });
});

