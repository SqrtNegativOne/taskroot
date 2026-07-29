export interface IAuthManager {
    getToken(): string | undefined;
    refreshAccessToken(): Promise<boolean>;
}
