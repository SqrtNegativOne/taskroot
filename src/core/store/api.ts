import { ResultAsync } from "neverthrow";

export const API_TIMEOUT_MS = 15000;

export function fetchWithTimeout(
    resource: RequestInfo | URL,
    options: RequestInit & { timeout?: number } = {},
): ResultAsync<Response, Error> {
    const { timeout = API_TIMEOUT_MS, ...rest } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    return ResultAsync.fromPromise(
        fetch(resource, {
            ...rest,
            signal: controller.signal,
        }).then((res) => {
            clearTimeout(id);
            return res;
        }),
        (error: unknown) => {
            clearTimeout(id);
            if (error instanceof Error && error.name === "AbortError") {
                return new Error("Request timed out", { cause: error });
            }
            return error instanceof Error ? error : new Error(String(error));
        }
    );
}

export const api = {
    clearAllData: async () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("taskroot_")) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
};
