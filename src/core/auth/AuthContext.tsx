import React, { useState } from "react";

import { AuthContext } from "./context";

import { useNotification } from "../utils/notifications";
export interface User { uid: string; email: string; displayName: string; }

import {
    loadRemoteIdentityScript,
    requestGoogleAuthCode,
    exchangeAuthCodeForTokens,
} from "./googleAuthUtils";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | undefined>(() => {
        const token = localStorage.getItem("google_access_token");
        return token ? { uid: "local-user", email: "user@example.com", displayName: "Local User" } : undefined;
    });
    const [loading] = useState(false);
    const { notify } = useNotification();

    const loginWithGoogle = React.useCallback(async () => {
        try {
            await loadRemoteIdentityScript();
            const code = await requestGoogleAuthCode();
            const tokens = await exchangeAuthCodeForTokens(code);

            if (tokens.accessToken) {
                localStorage.setItem("google_access_token", tokens.accessToken);
                if (tokens.refreshToken) {
                    localStorage.setItem("google_refresh_token", tokens.refreshToken);
                }
                window.location.reload(); // Reload to start sync
            }
        } catch (error: unknown) {
            console.error("Error signing in with Google:", error);
            const message = error instanceof Error ? error.message : String(error);
            notify(`Sign in failed: ${message}`, "error");
        }
    }, [notify]);

    const logout = React.useCallback(async () => {
        try {
            localStorage.removeItem("google_access_token");
            localStorage.removeItem("google_refresh_token");
            setUser(undefined);
            window.location.reload();
        } catch (error: unknown) {
            console.error("Error signing out:", error);
            const message =
                error instanceof Error ? error.message : String(error);
            notify(`Logout failed: ${message}`, "error");
        }
    }, [notify]);

    const contextValue = React.useMemo(
        () => ({ user, loading, loginWithGoogle, logout }),
        [user, loading, loginWithGoogle, logout]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};


