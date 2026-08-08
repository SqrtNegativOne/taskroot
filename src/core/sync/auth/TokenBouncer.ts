import { fetchWithTimeout } from "../../store/api";
import type { IAuthManager } from "./types";

export class GoogleAuthManager implements IAuthManager {
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | undefined = undefined;

    getToken(): string | undefined {
        return localStorage.getItem("google_access_token") ?? undefined;
    }

    async refreshAccessToken(): Promise<boolean> {
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._refresh();
        const result = await this.refreshPromise;
        this.isRefreshing = false;
        this.refreshPromise = undefined;
        return result;
    }

    private async _refresh(): Promise<boolean> {
        const refreshToken = localStorage.getItem("google_refresh_token");
        if (!refreshToken) return false;

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        });

        const result = await fetchWithTimeout(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            },
        );
        
        if (result.isOk()) {
            try {
                const res = result.value;
                const data = await res.json();
                if (data.access_token) {
                    localStorage.setItem("google_access_token", data.access_token);
                    return true;
                }
            } catch (e) {
                console.error("Failed to parse token response", e);
            }
        } else {
            console.error("Failed to refresh token", result.error);
        }
        
        return false;
    }
}

