// oxlint-disable eslint/max-classes-per-file
export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class AuthError extends Error {
    constructor(message: string = "Unauthorized") {
        super(message);
        this.name = "AuthError";
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NetworkError";
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}

export class ApiError extends Error {
    public status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export class UnknownError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnknownError";
        Object.setPrototypeOf(this, UnknownError.prototype);
    }
}

export type SyncError = AuthError | NetworkError | ApiError | ConflictError | UnknownError;

export function toSyncError(e: unknown): SyncError {
    if (e instanceof AuthError || e instanceof NetworkError || e instanceof ApiError || e instanceof ConflictError || e instanceof UnknownError) return e;
    if (e instanceof Error) return new UnknownError(e.message);
    return new UnknownError(String(e));
}
