import { MS_PER_SECOND, MS_PER_MINUTE } from "../../core/utils/constants";
import React, { useEffect, useRef } from "react";
import { Icon } from "../icon";
import { syncState, poller } from "../../core/sync";
import { WindowControls } from "./window-controls";

export function SyncStatus() {
    const syncStatus = React.useSyncExternalStore(
        (listener) => syncState.subscribe(listener),
        () => syncState.getUiStatus()
    );
    const syncBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (syncStatus === "sync_disabled") {
            if (syncBtnRef.current) syncBtnRef.current.title = "Sync Disabled";
            return undefined;
        }

        const updateTitle = () => {
            if (!syncBtnRef.current) return;
            const remaining = Math.max(0, syncState.nextSyncTime - Date.now());
            const m = Math.floor(remaining / MS_PER_MINUTE);
            const s = Math.floor((remaining % MS_PER_MINUTE) / MS_PER_SECOND);
            syncBtnRef.current.title = `Next sync in ${m}m ${s}s (Click to force sync)`;
        };

        updateTitle();
        const interval = setInterval(updateTitle, MS_PER_SECOND);
        return () => clearInterval(interval);
    }, [syncStatus]);

    return (
        <WindowControls>
            <button
                ref={syncBtnRef}
                className="win-btn sync-btn"
                onClick={() => poller.forceSync()}
                data-cuelume-hover="tick"
                data-cuelume-toggle
            >
                <Icon
                    name={syncStatus === "syncing" ? "sync" : syncStatus}
                    size={18}
                    className={`sync-icon ${syncStatus === "syncing" ? "is-syncing" : ""}`}
                    style={{
                        color: syncStatus === "sync_problem" ? "#ff4444" : undefined,
                    }}
                />
            </button>
        </WindowControls>
    );
}
