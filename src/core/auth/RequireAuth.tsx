import React from "react";
import { useAuth } from "./useAuth";
import { useNotification } from "../utils/notifications";

export function RequireAuth({
    children,
    loginFallback,
    titleBar,
}: {
    children: React.ReactNode;
    loginFallback: React.ReactNode;
    titleBar?: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { notify } = useNotification();
    const notified = React.useRef(false);
    const OFFLINE_NOTIFY_DELAY_MS = 500;

    if (import.meta.env.VITE_OFFLINE_MODE === "true") {
        if (!notified.current) {
            notified.current = true;
            // Use setTimeout to ensure it doesn't fire during render
            setTimeout(
                () => notify("Offline mode: Bypassed login", "info"),
                OFFLINE_NOTIFY_DELAY_MS,
            );
        }
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="app">
                {titleBar}
                <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
                    Loading...
                </div>
            </div>
        );
    }
    
    const hasGoogleToken = !!localStorage.getItem("google_access_token");

    if (!user || !hasGoogleToken) return <>{loginFallback}</>;
    return <>{children}</>;
}
