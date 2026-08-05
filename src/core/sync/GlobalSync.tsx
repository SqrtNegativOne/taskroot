import React from "react";
import { useEvents, useSettings, useTasks } from "../store/hooks";
import { purgeOrphanedData } from "../store/repositories";
import { syncState, poller } from "./index";
import { useNotification } from "../utils/notifications";
import { LoginTitleBar } from "../../components/shell";

export function GlobalSyncLoading({ syncMessage }: { syncMessage: string | null }) {
    if (window.location.search.includes("minitracker=true")) {
        return <></>;
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

export function GlobalSync({ children }: { children: React.ReactNode }) {
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
