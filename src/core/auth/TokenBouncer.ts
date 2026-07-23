import { fetchWithTimeout } from "../store/api";
import { googleCalendarAPI } from "../sync/GoogleCalendarAPI";
import { googleTasksAPI } from "../sync/GoogleTasksAPI";

class TokenBouncer {
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    async refreshAccessToken(): Promise<boolean> {
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._refresh();
        const result = await this.refreshPromise;
        this.isRefreshing = false;
        this.refreshPromise = null;
        return result;
    }

    private async _refresh(): Promise<boolean> {
        const refreshToken = localStorage.getItem("google_refresh_token");
        if (!refreshToken) return false;

        try {
            // @ts-ignore
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            // @ts-ignore
            const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

            const params = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            });

            const res = await fetchWithTimeout(
                "https://oauth2.googleapis.com/token",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: params.toString(),
                },
            );
            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem("google_access_token", data.access_token);
                googleCalendarAPI.setToken(data.access_token);
                googleTasksAPI.setToken(data.access_token);
                return true;
            }
        } catch (e) {
            console.error("Failed to refresh token", e);
        }
        return false;
    }
}

export const tokenBouncer = new TokenBouncer();
