import { Result, ok } from "neverthrow";
import { QuotaExceededError, SerializationError, DataCorruptionError } from "./errors";

if (typeof window === "undefined")
    throw new Error("storeRegistry can only be used in a browser environment");

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
    setLocalData(key: string, data: unknown): Result<void, SerializationError | QuotaExceededError | Error> {
        return safeStringify(data)
            .andThen((stringified) => safeSetItem(`taskroot_${key}`, stringified));
    },

    getLocalData<T = unknown>(key: string): Result<T, DataCorruptionError> {
        const res: Result<T, DataCorruptionError> = safeGetItem(`taskroot_${key}`)
            .andThen((saved) => (saved ? safeParse(saved) : ok(undefined)));
        return res;
    }
};