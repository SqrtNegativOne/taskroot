export async function fetchWithTimeout(
    resource: RequestInfo | URL,
    options: RequestInit & { timeout?: number } = {},
) {
    const { timeout = 15000, ...rest } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...rest,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error: unknown) {
        clearTimeout(id);
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Request timed out", { cause: error });
        }
        throw error;
    }
}

export const api = {
    clearAllData: async () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("taskroot_")) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
};
