import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStored } from "./store";
import { api } from "./api";

vi.mock("./api", () => {
    const store = new Map<string, any>();
    const subscriptions = new Map<string, Set<Function>>();

    return {
        api: {
            __fakeStore: store,
            __fakeSubscriptions: subscriptions,
            subscribeToStore: (
                key: string,
                initial: any,
                onData: Function,
                onReady: Function,
            ) => {
                if (!subscriptions.has(key)) {
                    subscriptions.set(key, new Set());
                }
                subscriptions.get(key)!.add(onData);

                onReady();

                return () => {
                    subscriptions.get(key)?.delete(onData);
                };
            },
            saveStoreData: (key: string, data: any) => {
                store.set(key, data);
            },
            triggerRemoteUpdate: (key: string, data: any) => {
                store.set(key, data);
                subscriptions.get(key)?.forEach((cb) => cb(data));
            },
        },
    };
});

describe("useStored Hook", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Clear fake state
        (api as any).__fakeStore.clear();
        (api as any).__fakeSubscriptions.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("initializes with the provided fallback value if localStorage is empty", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        expect(result.current[0]).toEqual({ count: 0 });
        expect(result.current[2]).toBe(true); // isLoaded should be true since onReady was called
    });

    it("initializes with value from localStorage if it exists", () => {
        localStorage.setItem("taskroot_test_key", JSON.stringify({ count: 5 }));

        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        expect(result.current[0]).toEqual({ count: 5 });
    });

    it("updates state, localStorage, and calls API when setValWrapper is called with a new value", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        act(() => {
            // result.current[1] is the setValWrapper
            result.current[1]({ count: 10 });
        });

        expect(result.current[0]).toEqual({ count: 10 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 10 }),
        );
        expect((api as any).__fakeStore.get("test_key")).toEqual({ count: 10 });
    });

    it("updates state, localStorage, and calls API when setValWrapper is called with an updater function", () => {
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
        expect((api as any).__fakeStore.get("test_key")).toEqual({ count: 5 });
    });

    it("updates state and localStorage when API subscription sends new data", () => {
        const { result } = renderHook(() =>
            useStored("test_key", { count: 0 }),
        );

        act(() => {
            (api as any).triggerRemoteUpdate("test_key", { count: 42 }); // Simulate data coming from cloud
        });

        expect(result.current[0]).toEqual({ count: 42 });
        expect(localStorage.getItem("taskroot_test_key")).toBe(
            JSON.stringify({ count: 42 }),
        );
    });
});
