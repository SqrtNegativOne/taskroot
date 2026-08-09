import { Result, ok } from "neverthrow";
import { QuotaExceededError, SerializationError, DataCorruptionError } from "./errors";

// A simple registry to let Sync modules update the local store (React state + localStorage)
type BivariantUpdater = { bivariantHack(data: unknown): void }["bivariantHack"];
const updaters = new Map<string, Set<BivariantUpdater>>();

const safeStringify = Result.fromThrowable(
    JSON.stringify,
    (e) => new SerializationError(e instanceof Error ? e.message : String(e))
);

const safeSetItem = Result.fromThrowable(
    (key: string, value: string) => localStorage.setItem(key, value),
    (e: unknown) => {
        if (e && typeof e === "object" && "name" in e) {
            if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                return new QuotaExceededError();
            }
        }
        if (e instanceof Error && e.message.toLowerCase().includes("quota")) {
            return new QuotaExceededError();
        }
        return e instanceof Error ? e : new Error(String(e));
    }
);

const safeGetItem = Result.fromThrowable(
    (key: string) => localStorage.getItem(key),
    (e) => new DataCorruptionError(e instanceof Error ? e.message : String(e))
);

const safeParse = Result.fromThrowable(
    JSON.parse,
    (e) => new DataCorruptionError(e instanceof Error ? e.message : String(e))
);

export const storeRegistry = {
    onExternalChange(key: string, updater: (val: unknown) => void) {
        if (!updaters.has(key)) {
            updaters.set(key, new Set());
        }
        updaters.get(key)?.add(updater);
        return () => {
            const set = updaters.get(key);
            if (set) set.delete(updater);
        };
    },
    
    setLocalData(key: string, data: unknown, silent: boolean = false): Result<void, SerializationError | QuotaExceededError | Error> {
        return safeStringify(data)
            .andThen((stringified) => safeSetItem(`taskroot_${key}`, stringified))
            .map(() => {
                if (silent) return;
                const set = updaters.get(key);
                if (set)
                    set.forEach((updater) => updater(data));
            });
    },
    
    getLocalData<T = unknown>(key: string): Result<T, DataCorruptionError> {
        const res: Result<T, DataCorruptionError> = safeGetItem(`taskroot_${key}`)
            .andThen((saved) => (saved ? safeParse(saved) : ok(undefined)));
        return res;
    }
};

if (typeof window === "undefined")
    throw new Error("storeRegistry can only be used in a browser environment");

window.addEventListener("storage", (e) => {
    if (!(e.key?.startsWith("taskroot_"))) return;
    const key = e.key.replace("taskroot_", "");
    const set = updaters.get(key);
    
    if (!set || !e.newValue) return;
    
    safeParse(e.newValue).map((data) => {
        set.forEach((updater) => updater(data));
    }).mapErr((err) => {
        console.error("Failed to parse storage event", err);
    });
});