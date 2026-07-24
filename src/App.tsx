import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./core/auth/AuthContext";


import { PlanScreen } from "./screens/plan/PlanScreen";
import { DoScreen } from "./screens/do/DoScreen";
import { SettingsScreen } from "./screens/settings/SettingsScreen";

import { useEvents, useSettings, useTasks } from "./core/store/hooks";
import { purgeOrphanedData } from "./core/store/repositories";


import { syncState, poller } from "./core/sync";
import {
    NotificationProvider,
    useNotification,
} from "./core/utils/notifications";
import { LoginScreen } from "./screens/login/LoginScreen";
import { WrapScreen } from "./screens/wrap/WrapScreen";
import { GraphScreen } from "./screens/graph/GraphScreen";
import { StatsScreen } from "./screens/stats/StatsScreen";
import { RecapScreen } from "./screens/recap/RecapScreen";
import { MiniTrackerScreen } from "./screens/minitracker/MiniTrackerScreen";

function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { notify } = useNotification();
    const notified = React.useRef(false);

    if (import.meta.env.VITE_OFFLINE_MODE === "true") {
        if (!notified.current) {
            notified.current = true;
            // Use setTimeout to ensure it doesn't fire during render
            setTimeout(
                () => notify("Offline mode: Bypassed login", "info"),
                500,
            );
        }
        return <>{children}</>;
    }

    if (loading) return <div>Loading...</div>;
    
    const hasGoogleToken = !!localStorage.getItem("google_access_token");

    if (!user || (!hasGoogleToken && !window.location.search.includes("minitracker=true"))) {
        return <LoginScreen />;
    }
    return <>{children}</>;
}

function AppRouter() {
    const navigate = useNavigate();
    const [settings] = useSettings();

    React.useEffect(() => {
        const api = window.electronAPI;
        if (api?.onDeepLink) {
            api.onDeepLink((route: string) => {
                navigate(`/${route}`);
            });
        }
    }, [navigate]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLElement &&
                (e.target.tagName === "INPUT" ||
                    e.target.tagName === "TEXTAREA" ||
                    e.target.isContentEditable)
            ) {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
            }

            const kb = settings.keybindingOpenSettings || "Ctrl+,";
            const parts = kb.split("+");
            const key = parts.pop();
            const needsCtrl = parts.includes("Ctrl");
            const needsAlt = parts.includes("Alt");
            const needsShift = parts.includes("Shift");
            const needsMeta = parts.includes("Meta");

            const keyMatch =
                e.key.toUpperCase() === key?.toUpperCase() ||
                (e.key === " " && key === "Space");
            if (
                e.ctrlKey === needsCtrl &&
                e.altKey === needsAlt &&
                e.shiftKey === needsShift &&
                e.metaKey === needsMeta &&
                keyMatch
            ) {
                e.preventDefault();
                navigate("/settings");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, settings.keybindingOpenSettings]);

    return (
        <Routes>
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/do" element={<DoScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/wrap" element={<WrapScreen />} />
            <Route path="/graph" element={<GraphScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/recap" element={<RecapScreen />} />
            <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
    );
}

function GlobalSync({ children }: { children: React.ReactNode }) {
    const [, , tasksLoaded] = useTasks();
    const [, , eventsLoaded] = useEvents();
    const [settings] = useSettings();
    const [initialSyncDone, setInitialSyncDone] = React.useState(
        syncState.initialSyncComplete,
    );
    const [syncMessage, setSyncMessage] = React.useState(syncState.getUiMessage());
    const { notify } = useNotification();

    React.useEffect(() => {
        purgeOrphanedData(notify);
        poller.start();
    }, [settings]);

    React.useEffect(() => {
        const unsub = syncState.subscribe(() => {
            setInitialSyncDone(syncState.initialSyncComplete);
            setSyncMessage(syncState.getUiMessage());
            
            if (syncState.error) {
                notify(`Sync error: ${syncState.error}`, "error");
                syncState.error = null;
            }
            if (syncState.info) {
                notify(syncState.info, "info");
                syncState.info = null;
            }
        });
        return unsub;
    }, [notify]);

    if (!tasksLoaded || !eventsLoaded || !initialSyncDone) {
        if (window.location.search.includes("minitracker=true")) {
            return null;
        }
        return (
            <div
                style={{
                    display: "flex",
                    height: "100vh",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    background: "var(--bg)",
                    color: "var(--fg)",
                    fontFamily: "var(--sans)",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "3px solid var(--border)",
                        borderTopColor: "var(--accent)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }}
                />
                <div
                    style={{
                        marginTop: "16px",
                        color: "var(--fg-dim)",
                        fontSize: "0.9rem",
                    }}
                >
                    {syncMessage || "Syncing data..."}
                </div>
                <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    return <>{children}</>;
}

export default function App() {
    React.useEffect(() => {
        import("cuelume").then(({ bind }) => bind());
    }, []);

    if (window.location.search.includes("minitracker=true")) {
        return (
            <GlobalSync>
                <MiniTrackerScreen />
            </GlobalSync>
        );
    }

    return (
        <NotificationProvider>
            <AuthProvider>
                <RequireAuth>
                    <GlobalSync>
                        <AppRouter />
                    </GlobalSync>
                </RequireAuth>
            </AuthProvider>
        </NotificationProvider>
    );
}
