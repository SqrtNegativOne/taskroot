import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStored } from "./store";
import { syncEngine } from "../sync/SyncEngine";

vi.mock("../sync/SyncEngine", () => {
    const updaters = new Map<string, Set<Function>>();

    return {
        syncEngine: {
            __fakeUpdaters: updaters,
            registerUpdater: (key: string, onData: Function) => {
                if (!updaters.has(key)) {
                    updaters.set(key, new Set());
                }
                updaters.get(key)!.add(onData);
                return () => {
                    updaters.get(key)?.delete(onData);
                };
            },
            notifyDataChanged: vi.fn(),
            triggerRemoteUpdate: (key: string, data: any) => {
                updaters.get(key)?.forEach((cb) => cb(data));
            },
        },
    };
});

describe("useStored Hook", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        (syncEngine as any).__fakeUpdaters.clear();
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
            const setter = result.current[1] as any;
            setter((prev: any) => ({ count: prev.count + 3 }));
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
            (syncEngine as any).triggerRemoteUpdate("test_key", { count: 42 }); // Simulate data coming from cloud
        });

        expect(result.current[0]).toEqual({ count: 42 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 42 }),
        );
    });
});
