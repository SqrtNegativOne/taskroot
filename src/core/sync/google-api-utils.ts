import { ResultAsync } from "neverthrow";
import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_TOO_MANY_REQUESTS, MS_PER_SECOND } from "../utils/constants";
import { fetchWithTimeout } from "../store/api";
import type { IAuthManager } from "./auth/types";
import { AuthError, NetworkError, type SyncError } from "./errors";

export interface GoogleApiErrorResponse {
    error?: {
        errors?: {
            reason?: string;
        }[];
    };
}

async function checkRateLimit(res: Response) {
    if (res.status === HTTP_TOO_MANY_REQUESTS) return true;
    const clone = res.clone();
    try {
        const data: GoogleApiErrorResponse = await clone.json();
        return data?.error?.errors?.some(e => e.reason === "rateLimitExceeded" || e.reason === "userRateLimitExceeded") ?? false;
    } catch {
        return false;
    }
}

export function fetchWithRateLimitAndAuth(
    url: string,
    authManager: IAuthManager,
    options: RequestInit = {}
): ResultAsync<Response, SyncError> {
    const getOpts = (t: string) => {
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${t}`);
        return { ...options, headers };
    };
    

    return ResultAsync.fromPromise(
        (async () => {
            let token = authManager.getToken();
            if (!token) throw new AuthError();
            
            let result = await fetchWithTimeout(url, getOpts(token));
            if (result.isErr()) throw result.error;
            let res = result.value;
            
            if (res.status === HTTP_UNAUTHORIZED) {
                if (!await authManager.refreshAccessToken()) throw new AuthError();
                token = authManager.getToken();
                if (!token) throw new AuthError();
                
                result = await fetchWithTimeout(url, getOpts(token));
                if (result.isErr()) throw result.error;
                res = result.value;
            }
            
            let attempts = 0;
            const maxAttempts = 3;
            while ((res.status === HTTP_FORBIDDEN || res.status === HTTP_TOO_MANY_REQUESTS) && attempts < maxAttempts) {
                const isRateLimit = await checkRateLimit(res);
                if (!isRateLimit) break;
        
                attempts++;
                const delay = Math.pow(2, attempts) * MS_PER_SECOND + Math.random() * MS_PER_SECOND;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                result = await fetchWithTimeout(url, getOpts(token));
                if (result.isErr()) throw result.error;
                res = result.value;
            }
            return res;
        })(),
        (e) => {
            if (e instanceof AuthError) return e;
            return new NetworkError(e instanceof Error ? e.message : String(e));
        }
    );
}
