import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./core/auth/useAuth";
import { AuthProvider } from "./core/auth/AuthContext";
import { useEvents, useSettings, useTasks } from "./core/store/hooks";
import { purgeOrphanedData } from "./core/store/repositories";
import { syncState, poller } from "./core/sync";
import { useNotification, NotificationProvider } from "./core/utils/notifications";
import { LoginScreen } from "./screens/login/LoginScreen";
import { AppLayout } from "./components/AppLayout";
import { LoginTitleBar } from "./components/shell";

const PlanScreen        = React.lazy(() => import("./screens/plan/PlanScreen").then(m => ({ default: m.PlanScreen })));
const DoScreen          = React.lazy(() => import("./screens/do/DoScreen").then(m => ({ default: m.DoScreen })));
const SettingsScreen    = React.lazy(() => import("./screens/settings/SettingsScreen").then(m => ({ default: m.SettingsScreen })));
const WrapScreen        = React.lazy(() => import("./screens/wrap/WrapScreen").then(m => ({ default: m.WrapScreen })));
const GraphScreen       = React.lazy(() => import("./screens/graph/GraphScreen").then(m => ({ default: m.GraphScreen })));
const StatsScreen       = React.lazy(() => import("./screens/stats/StatsScreen").then(m => ({ default: m.StatsScreen })));
const RecapScreen       = React.lazy(() => import("./screens/recap/RecapScreen").then(m => ({ default: m.RecapScreen })));
const MiniTrackerScreen = React.lazy(() => import("./screens/minitracker/MiniTrackerScreen").then(m => ({ default: m.MiniTrackerScreen })));

function RequireAuth({ children }: { children: React.ReactNode }) {
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
                <LoginTitleBar />
                <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
                    Loading...
                </div>
            </div>
        );
    }
    
    const hasGoogleToken = !!localStorage.getItem("google_access_token");

    if (!user || !hasGoogleToken) return <LoginScreen />;
    return <>{children}</>;
}

const parseKeybinding = (kb: string) => {
    const parts = kb.split("+");
    const key = parts.pop();
    return {
        key,
        needsCtrl: parts.includes("Ctrl"),
        needsAlt: parts.includes("Alt"),
        needsShift: parts.includes("Shift"),
        needsMeta: parts.includes("Meta"),
    };
};

function isInputEvent(e: KeyboardEvent) {
    if (!(e.target instanceof HTMLElement)) return false;
    return e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;
}

function isKeyMatch(e: KeyboardEvent, parsedKb: { key: string | undefined, needsCtrl: boolean, needsAlt: boolean, needsShift: boolean, needsMeta: boolean }) {
    const { key, needsCtrl, needsAlt, needsShift, needsMeta } = parsedKb;
    const keyMatch = e.key.toUpperCase() === key?.toUpperCase() || (e.key === " " && key === "Space");
    return e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift && e.metaKey === needsMeta && keyMatch;
}

const handleSettingsKeydown = (
    e: KeyboardEvent,
    settingsKb: string,
    navigate: (path: string) => void,
) => {
    if (isInputEvent(e) && !e.ctrlKey && !e.metaKey && !e.altKey)
        return;

    const parsedKb = parseKeybinding(settingsKb || "Ctrl+,");

    if (isKeyMatch(e, parsedKb)) {
        e.preventDefault();
        navigate("/settings");
    }
};



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
        const handler = (e: KeyboardEvent) =>
            handleSettingsKeydown(e, settings.keybindingOpenSettings, navigate);
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [navigate, settings.keybindingOpenSettings]);

    return (
        <React.Suspense fallback={undefined}>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/plan" element={<PlanScreen />} />
                    <Route path="/do" element={<DoScreen />} />
                    <Route path="/settings" element={<SettingsScreen />} />
                    <Route path="/wrap" element={<WrapScreen />} />
                    <Route path="/graph" element={<GraphScreen />} />
                    <Route path="/stats" element={<StatsScreen />} />
                    <Route path="/recap" element={<RecapScreen />} />
                </Route>
                <Route path="*" element={<Navigate to="/plan" replace />} />
            </Routes>
        </React.Suspense>
    );
}

function GlobalSyncLoading({ syncMessage }: { syncMessage: string | null }) {
    if (window.location.search.includes("minitracker=true")) {
        // eslint-disable-next-line unicorn/no-null
        return null;
    }
    return (
        <div className="app">
            <LoginTitleBar />
            <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", flexDirection: "column", background: "var(--bg)", color: "var(--fg)", fontFamily: "var(--sans)" }}>
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
        </div>
    );
}

function GlobalSync({ children }: { children: React.ReactNode }) {
    const [, , tasksLoaded] = useTasks();
    const [, , eventsLoaded] = useEvents();
    const [settings] = useSettings();
    const initialSyncDone = React.useSyncExternalStore(
        (listener) => syncState.subscribe(listener),
        () => syncState.initialSyncComplete
    );
    const syncMessage = React.useSyncExternalStore(
        (listener) => syncState.subscribe(listener),
        () => syncState.getUiMessage()
    );
    const { notify } = useNotification();

    React.useEffect(() => {
        purgeOrphanedData(notify);
        poller.start();
    }, [settings, notify]);

    React.useEffect(() => {
        const checkNotifications = () => {
            if (syncState.error) {
                notify(`Sync error: ${syncState.error}`, "error");
                syncState.error = undefined;
            }
            if (syncState.info) {
                notify(syncState.info, "info");
                syncState.info = undefined;
            }
        };
        checkNotifications();
        const unsub = syncState.subscribe(checkNotifications);
        return unsub;
    }, [notify]);

    if (!tasksLoaded || !eventsLoaded || !initialSyncDone) {
        return <GlobalSyncLoading syncMessage={syncMessage} />;
    }

    return <>{children}</>;
}

export function App() {
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
