import React, { createContext, useContext, useState } from "react";

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    loginWithGoogle: async () => {},
    logout: async () => {},
});

import { useNotification } from "../utils/notifications";

import {
    loadGoogleIdentityScript,
    requestGoogleAuthCode,
    exchangeAuthCodeForTokens,
} from "./googleAuthUtils";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(() => {
        const token = localStorage.getItem("google_access_token");
        return token ? { uid: "local-user", email: "user@example.com", displayName: "Local User", photoURL: null } : null;
    });
    const [loading] = useState(false);
    const { notify } = useNotification();

    const loginWithGoogle = async () => {
        try {
            await loadGoogleIdentityScript();
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
    };

    const logout = async () => {
        try {
            localStorage.removeItem("google_access_token");
            localStorage.removeItem("google_refresh_token");
            setUser(null);
            window.location.reload();
        } catch (error: unknown) {
            console.error("Error signing out:", error);
            const message =
                error instanceof Error ? error.message : String(error);
            notify(`Logout failed: ${message}`, "error");
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, loginWithGoogle, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
