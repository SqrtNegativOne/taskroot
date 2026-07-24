import { fetchWithTimeout } from "../store/api";

export function loadGoogleIdentityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Identity Services script"));
        document.body.appendChild(script);
    });
}

export function requestGoogleAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
                ux_mode: "popup",
                callback: (response: unknown) => {
                    const res = response as { code?: string };
                    if (res.code) {
                        resolve(res.code);
                    } else {
                        reject(new Error((response as { error?: string })?.error || "Failed to get auth code from Google popup"));
                    }
                },
                error_callback: (error: unknown) => {
                    reject(new Error((error as { message?: string })?.message || "Google popup error"));
                },
            });
            client.requestCode();
        } catch (err) {
            reject(err);
        }
    });
}

export async function exchangeAuthCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const params = new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: "postmessage",
    });

    const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const data = await res.json();
    if (data.access_token) {
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
        };
    } else {
        throw new Error(data.error_description || data.error || "Failed to exchange token");
    }
}

