import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_TOO_MANY_REQUESTS, MS_PER_SECOND } from "../../utils/constants";
import { fetchWithTimeout } from "../store/api";
import type { IAuthManager } from "../auth/types";

export interface GoogleApiErrorResponse {
    error?: {
        errors?: {
            reason?: string;
        }[];
    };
}

export async function fetchWithRateLimitAndAuth(
    url: string,
    authManager: IAuthManager,
    options: RequestInit = {}
): Promise<Response> {
    const getOpts = (t: string) => ({ ...options, headers: { ...options.headers, Authorization: `Bearer ${t}` } });
    let token = authManager.getToken();
    if (!token) throw new Error("Unauthorized");
    
    let res = await fetchWithTimeout(url, getOpts(token));
    
    if (res.status === HTTP_UNAUTHORIZED) {
        if (!await authManager.refreshAccessToken()) throw new Error("Unauthorized");
        token = authManager.getToken();
        if (!token) throw new Error("Unauthorized");
        res = await fetchWithTimeout(url, getOpts(token));
    }
    
    let attempts = 0;
    const maxAttempts = 3;
    while ((res.status === HTTP_FORBIDDEN || res.status === HTTP_TOO_MANY_REQUESTS) && attempts < maxAttempts) {
        const clone = res.clone();
        try {
            // Google API error shapes vary, so we define a structural type to extract rate limit reasons.
            // Necessary for parsing rate limit errors sequentially
            // eslint-disable-next-line no-await-in-loop
            const data: GoogleApiErrorResponse = await clone.json();
            const isRateLimit = res.status === HTTP_TOO_MANY_REQUESTS || (data?.error?.errors?.some(e => e.reason === "rateLimitExceeded" || e.reason === "userRateLimitExceeded"));
            if (isRateLimit) {
                attempts++;
                const delay = Math.pow(2, attempts) * MS_PER_SECOND + Math.random() * MS_PER_SECOND;
                // Necessary for exponential backoff delay
                // eslint-disable-next-line no-await-in-loop
                await new Promise(resolve => setTimeout(resolve, delay));
                // Necessary for sequential retry of the failed request
                // eslint-disable-next-line no-await-in-loop
                res = await fetchWithTimeout(url, getOpts(token));
            } else {
                break;
            }
        } catch {
            break;
        }
    }
    return res;
}
