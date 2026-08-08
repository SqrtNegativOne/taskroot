import { fetchWithTimeout } from "../store/api";
import { ResultAsync, ok, err } from "neverthrow";

export function loadRemoteIdentityScript(): ResultAsync<void, Error> {
    return ResultAsync.fromPromise(
        new Promise<void>((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.addEventListener("load", () => resolve());
            script.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services script")));
            document.body.appendChild(script);
        }),
        (e) => e instanceof Error ? e : new Error(String(e))
    );
}

export function requestGoogleAuthCode(): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Promise<string>((resolve, reject) => {
            try {
                if (!window.google?.accounts?.oauth2) {
                    reject(new Error("Google Identity Services not loaded"));
                    return;
                }
                const client = window.google.accounts.oauth2.initCodeClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
                    ux_mode: "popup",
                    callback: (response) => {
                        if (response.code) {
                            resolve(response.code);
                        } else {
                            reject(new Error(response.error || "Failed to get auth code from Google popup"));
                        }
                    },
                    error_callback: (error) => {
                        reject(new Error(error.message || "Google popup error"));
                    },
                });
                client.requestCode();
            } catch (e) {
                reject(e);
            }
        }),
        (e) => e instanceof Error ? e : new Error(String(e))
    );
}

export function exchangeAuthCodeForTokens(code: string): ResultAsync<{ accessToken: string; refreshToken?: string }, Error> {
    const params = new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: "postmessage",
    });

    return fetchWithTimeout("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    }).andThen(res => 
        ResultAsync.fromPromise(
            res.json(),
            (e) => e instanceof Error ? e : new Error(String(e))
        ).andThen(data => {
            if (data.access_token) {
                return ok({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                });
            } else {
                return err(new Error(data.error_description || data.error || "Failed to exchange token"));
            }
        })
    );
}

