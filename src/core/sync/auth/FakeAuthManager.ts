import type { IAuthManager } from "./types";

export class FakeAuthManager implements IAuthManager {
    private token: string | undefined = "fake-token";
    private willRefreshSuccess = true;

    setToken(token: string | undefined) {
        this.token = token;
    }

    setWillRefreshSuccess(success: boolean) {
        this.willRefreshSuccess = success;
    }

    getToken(): string | undefined {
        return this.token;
    }

    async refreshAccessToken(): Promise<boolean> {
        if (this.willRefreshSuccess) {
            this.token = "refreshed-fake-token";
            return true;
        }
        return false;
    }
}
