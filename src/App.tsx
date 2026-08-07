import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./core/auth/AuthContext";
import { NotificationProvider } from "./core/utils/notifications";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./core/auth/RequireAuth";
import { GlobalSync } from "./core/sync/GlobalSync";
import { useAppIntegration } from "./core/utils/useAppIntegration";

const PlanScreen        = React.lazy(() => import("./screens/plan/PlanScreen").then(m => ({ default: m.PlanScreen })));
const DoScreen          = React.lazy(() => import("./screens/do/DoScreen").then(m => ({ default: m.DoScreen })));
const SettingsScreen    = React.lazy(() => import("./screens/settings/SettingsScreen").then(m => ({ default: m.SettingsScreen })));
const WrapScreen        = React.lazy(() => import("./screens/wrap/WrapScreen").then(m => ({ default: m.WrapScreen })));
const GraphScreen       = React.lazy(() => import("./screens/graph/GraphScreen").then(m => ({ default: m.GraphScreen })));
const StatsScreen       = React.lazy(() => import("./screens/stats/StatsScreen").then(m => ({ default: m.StatsScreen })));
const RecapScreen       = React.lazy(() => import("./screens/recap/RecapScreen").then(m => ({ default: m.RecapScreen })));
const MiniTrackerScreen = React.lazy(() => import("./screens/minitracker/MiniTrackerScreen").then(m => ({ default: m.MiniTrackerScreen })));
const DevScreen         = React.lazy(() => import("./screens/dev/DevScreen").then(m => ({ default: m.DevScreen })));
const LauncherScreen    = React.lazy(() => import("./screens/launcher/LauncherScreen").then(m => ({ default: m.LauncherScreen })));
const DocsScreen        = React.lazy(() => import("./screens/docs/DocsScreen").then(m => ({ default: m.DocsScreen })));

function AppRouter() {
    useAppIntegration();

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
                    <Route path="/dev" element={<DevScreen />} />
                    <Route path="/docs/*" element={<DocsScreen />} />
                </Route>
                <Route path="*" element={<Navigate to="/plan" replace />} />
            </Routes>
        </React.Suspense>
    );
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

    if (window.location.search.includes("launcher=true")) {
        return (
            <React.Suspense fallback={undefined}>
                <LauncherScreen />
            </React.Suspense>
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
