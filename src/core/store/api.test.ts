import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "./api";

describe("api.ts", () => {
    describe("fetchWithTimeout", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should abort fetch if timeout is reached", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn<(...args: never[]) => unknown>((_url: unknown, init: RequestInit) =>
                    new Promise((_resolve, reject) => {
                        if (init?.signal) {
                            init.signal.addEventListener("abort", () => {
                                const err = new Error("AbortError");
                                err.name = "AbortError";
                                reject(err);
                            });
                        }
                    })
                )
            );

            const promise = fetchWithTimeout("https://example.com", {
                timeout: 1000,
            });

            const p = promise.catch(e => e);

            // Fast forward timers and flush microtasks
            await vi.advanceTimersByTimeAsync(1500);

            const err = await p;
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message).toBe("Request timed out");
            expect(global.fetch).toHaveBeenCalledOnce();
        });
    });
});
