import React, { createContext, useContext, useEffect, useState } from "react";
import {
    type User,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { GoogleAuthProvider } from "firebase/auth";

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

import { api, fetchWithTimeout } from "../store/api";
import { useNotification } from "../utils/notifications";

import {
    loadGoogleIdentityScript,
    requestGoogleAuthCode,
    exchangeAuthCodeForTokens,
} from "./googleAuthUtils";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { notify } = useNotification();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                setUser(currentUser);
                api.setUserId(currentUser ? currentUser.uid : undefined);
                setLoading(false);
            },
            (error) => {
                console.error("Auth State Error:", error);
                notify(`Authentication error: ${error.message}`, "error");
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [notify]);

    const loginWithGoogle = async () => {
        try {
            // 1. Sign into Firebase for database access
            await signInWithPopup(auth, googleProvider);

            // 2. Load Google Identity Services to get the offline auth code for Calendar sync
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
            notify(`Sign in failed: ${message}\nMake sure you have added your REAL Firebase config keys to a .env file!`, "error");
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("google_access_token");
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
