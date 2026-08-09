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

async function executeFetch(url: string, token: string, getOpts: (t: string) => RequestInit): Promise<Response> {
    const result = await fetchWithTimeout(url, getOpts(token));
    if (result.isErr()) throw result.error;
    return result.value;
}

async function fetchWithRetryOnUnauthorized(
    url: string,
    authManager: IAuthManager,
    getOpts: (t: string) => RequestInit
): Promise<{ res: Response; token: string }> {
    let token = authManager.getToken();
    if (!token) throw new AuthError();
    
    let res = await executeFetch(url, token, getOpts);
    if (res.status === HTTP_UNAUTHORIZED) {
        if (!(await authManager.refreshAccessToken())) throw new AuthError();
        token = authManager.getToken();
        if (!token) throw new AuthError();
        res = await executeFetch(url, token, getOpts);
    }
    return { res, token };
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
            const authResult = await fetchWithRetryOnUnauthorized(url, authManager, getOpts);
            let res = authResult.res;
            const token = authResult.token;
            
            let attempts = 0;
            const maxAttempts = 3;
            while ((res.status === HTTP_FORBIDDEN || res.status === HTTP_TOO_MANY_REQUESTS) && attempts < maxAttempts) {
                if (!(await checkRateLimit(res))) break;
        
                attempts++;
                const delay = Math.pow(2, attempts) * MS_PER_SECOND + Math.random() * MS_PER_SECOND;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                res = await executeFetch(url, token, getOpts);
            }
            return res;
        })(),
        (e) => {
            if (e instanceof AuthError) return e;
            return new NetworkError(e instanceof Error ? e.message : String(e));
        }
    );
}
