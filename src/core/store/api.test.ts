import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, fetchWithTimeout } from "./api";

describe("api.ts", () => {
    describe("fetchWithTimeout", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should abort fetch if timeout is reached", async () => {
            global.fetch = vi.fn(
                (url, init: any) =>
                    new Promise((resolve, reject) => {
                        if (init?.signal) {
                            init.signal.addEventListener("abort", () => {
                                const err = new Error("AbortError");
                                err.name = "AbortError";
                                reject(err);
                            });
                        }
                    }),
            ) as any;

            const promise = fetchWithTimeout("https://example.com", {
                timeout: 1000,
            });

            // Attach the expect handler before the promise rejects
            const expectPromise =
                expect(promise).rejects.toThrow("Request timed out");

            // Fast forward timers and flush microtasks
            await vi.advanceTimersByTimeAsync(1500);

            await expectPromise;
            expect(global.fetch).toHaveBeenCalledOnce();
        });
    });

    describe("ApiFacade", () => {
        it("should default to OfflineApi (no uid)", () => {
            expect(api.getUserId()).toBeUndefined();
        });

        it("should switch to OnlineApi when setUserId is called with a uid", () => {
            api.setUserId("user123");
            expect(api.getUserId()).toBe("user123");
        });

        it("should switch back to OfflineApi when setUserId is called without uid", () => {
            api.setUserId("user123");
            api.setUserId(undefined);
            expect(api.getUserId()).toBeUndefined();
        });
    });
});
