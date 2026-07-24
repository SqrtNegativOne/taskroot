import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStored } from "./store";
import { storeRegistry } from "./storeRegistry";
import { taskSync, eventSync, pusher } from "../sync";

const { __fakeUpdaters, triggerRemoteUpdate } = vi.hoisted(() => {
    const updaters = new Map<string, Set<(data: unknown) => void>>();
    return {
        __fakeUpdaters: updaters,
        triggerRemoteUpdate: (key: string, data: unknown) => {
            updaters.get(key)?.forEach((cb) => cb(data));
        },
    };
});

vi.mock("./storeRegistry", () => {
    return {
        storeRegistry: {
            registerUpdater: (key: string, onData: (data: unknown) => void) => {
                if (!__fakeUpdaters.has(key)) {
                    __fakeUpdaters.set(key, new Set());
                }
                __fakeUpdaters.get(key)!.add(onData);
                return () => {
                    __fakeUpdaters.get(key)?.delete(onData);
                };
            },
        },
    };
});

vi.mock("../sync", () => {
    return {
        taskSync: { computeTasksDelta: vi.fn() },
        eventSync: { computeEventsDelta: vi.fn() },
        pusher: { trigger: vi.fn() }
    };
});

describe("useStored Hook", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        __fakeUpdaters.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("initializes with the provided fallback value if localStorage is empty", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        expect(result.current[0]).toEqual({ count: 0 });
        expect(result.current[2]).toBe(true); // isLoaded should be true
    });

    it("initializes with value from localStorage if it exists", () => {
        localStorage.setItem("taskroot_test_key", JSON.stringify({ count: 5 }));

        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        expect(result.current[0]).toEqual({ count: 5 });
    });

    it("updates state and localStorage when setValWrapper is called with a new value", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        act(() => {
            result.current[1]({ count: 10 });
        });

        expect(result.current[0]).toEqual({ count: 10 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 10 }),
        );
    });

    it("updates state and localStorage when setValWrapper is called with an updater function", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 2 }),
        );

        act(() => {
            const setter = result.current[1];
            setter((prev) => ({ count: prev.count + 3 }));
        });

        expect(result.current[0]).toEqual({ count: 5 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 5 }),
        );
    });

    it("updates state and localStorage when syncEngine subscription sends new data", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        act(() => {
            triggerRemoteUpdate("test_key", { count: 42 }); // Simulate data coming from cloud
        });

        expect(result.current[0]).toEqual({ count: 42 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 42 }),
        );
    });
});
