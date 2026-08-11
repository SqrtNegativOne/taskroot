import { storeRegistry } from "./storeRegistry";
import { Result, ok } from "neverthrow";
import { QuotaExceededError, SerializationError, DataCorruptionError } from "./errors";

const isUpdater = <T>(v: T | ((prev: T) => T)): v is ((prev: T) => T) => typeof v === "function";

export class Repository<T> {
    public key: string;
    public initial: T;
    private parser?: ((saved: unknown) => T) | undefined;
    private interceptor?: ((next: T, prev?: T) => T) | undefined;
    private onDelta?: ((result: T, prev: T) => void) | undefined;

    private subscribers: Array<(next: T, prev?: T, source?: "local" | "remote") => void> = [];

    constructor(
        key: string,
        initial: T,
        options?: {
            parser?: ((saved: unknown) => T) | undefined;
            interceptor?: ((next: T, prev?: T) => T) | undefined;
            onDelta?: ((result: T, prev: T) => void) | undefined;
        }
    ) {
        this.key = key;
        this.initial = initial;
        this.parser = options?.parser;
        this.interceptor = options?.interceptor;
        this.onDelta = options?.onDelta;

        window.addEventListener("storage", (e) => {
            if (e.key !== `taskroot_${this.key}` || !e.newValue) return;
            const res = this.get();
            if (res.isOk()) {
                this.subscribers.forEach(cb => cb(res.value, undefined, "remote"));
            }
        });
    }

    subscribe(callback: (next: T, prev?: T, source?: "local" | "remote") => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    get(): Result<T, DataCorruptionError> {
        return storeRegistry.getLocalData(this.key).andThen((data) => {
            const raw = (data === null || data === undefined) ? this.initial : data;
            // T is erased at runtime. Without a parser provided, we have no runtime way
            // to validate if the parsed JSON matches T. We must blindly trust the data here.
            // oxlint-disable-next-line consistent-type-assertions, no-unsafe-type-assertion
            if (!this.parser) return ok(raw as T);
            
            const safeParser = Result.fromThrowable(
                this.parser,
                (e) => new DataCorruptionError(e instanceof Error ? e.message : String(e))
            );
            return safeParser(raw);
        });
    }

    set(newValOrUpdater: T | ((prev: T) => T)): Result<T, SerializationError | QuotaExceededError | Error> {
        const prevRes = this.get();
        // If there's corruption, fallback to initial for the update calculation
        const prev = prevRes.isOk() ? prevRes.value : this.initial;
        
        const next = isUpdater(newValOrUpdater) ? newValOrUpdater(prev) : newValOrUpdater;
        const mutated = this.interceptor ? this.interceptor(next, prev) : next;
        
        return storeRegistry.setLocalData(this.key, mutated).map(() => {
            if (this.onDelta) {
                this.onDelta(mutated, prev);
            }
            this.subscribers.forEach(cb => cb(mutated, prev, "local"));
            return mutated;
        });
    }

    setFromRemote(newVal: T): Result<T, SerializationError | QuotaExceededError | Error> {
        // Skips interceptors and onDelta, writes silently, then fires subscribers with "remote"
        return storeRegistry.setLocalData(this.key, newVal).map(() => {
            this.subscribers.forEach(cb => cb(newVal, undefined, "remote"));
            return newVal;
        });
    }
}
