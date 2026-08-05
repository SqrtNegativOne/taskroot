import React from "react";
import { poller, pusher, syncState } from "../../core/sync";

const wipeData = () => {
    if (confirm("Are you sure you want to wipe all local data?")) {
        localStorage.clear();
        window.location.reload();
    }
};

const resetAuth = () => {
    if (confirm("Are you sure you want to reset authentication?")) {
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("google_refresh_token");
        localStorage.removeItem("google_token_expiry");
        window.location.reload();
    }
};

export function DevScreen() {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    // Re-render on sync state changes
    React.useEffect(() => {
        return syncState.subscribe(() => forceUpdate());
    }, []);

    const clearQueue = () => {
        if (confirm("Are you sure you want to clear the sync queue?")) {
            pusher.queue.clear();
            forceUpdate();
        }
    };

    const handlePush = () => {
        pusher.trigger();
        forceUpdate();
    };

    const handlePull = () => {
        poller.forceSync();
        forceUpdate();
    };

    // Gather localStorage contents safely
    const lsContents: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            lsContents[key] = localStorage.getItem(key);
        }
    }

    return (
        <div className="dev-screen" style={{ padding: "20px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            <h1>Developer Mode</h1>
            
            <section style={{ marginBottom: "24px" }}>
                <h2>Sync Controls</h2>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={handlePush} className="btn">Push Sync</button>
                    <button onClick={handlePull} className="btn">Pull Sync</button>
                </div>
            </section>

            <section style={{ marginBottom: "24px" }}>
                <h2>Danger Zone</h2>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={wipeData} className="btn" style={{ background: "red", color: "white" }}>Wipe Local Data</button>
                    <button onClick={clearQueue} className="btn" style={{ background: "darkorange", color: "white" }}>Clear Sync Queue</button>
                    <button onClick={resetAuth} className="btn" style={{ background: "maroon", color: "white" }}>Reset Auth</button>
                </div>
            </section>

            <section style={{ marginBottom: "24px" }}>
                <h2>Push Queue Inspection ({pusher.queue.length})</h2>
                <pre style={{ background: "var(--bg-panel)", padding: "12px", borderRadius: "4px", fontSize: "12px", overflowX: "auto" }}>
                    {JSON.stringify(pusher.queue.getItems(), undefined, 2)}
                </pre>
            </section>

            <section style={{ marginBottom: "24px" }}>
                <h2>SyncState Inspection</h2>
                <pre style={{ background: "var(--bg-panel)", padding: "12px", borderRadius: "4px", fontSize: "12px", overflowX: "auto" }}>
                    {JSON.stringify(syncState, undefined, 2)}
                </pre>
            </section>

            <section style={{ marginBottom: "24px" }}>
                <h2>LocalStorage Inspection</h2>
                <pre style={{ background: "var(--bg-panel)", padding: "12px", borderRadius: "4px", fontSize: "12px", overflowX: "auto" }}>
                    {JSON.stringify(lsContents, undefined, 2)}
                </pre>
            </section>
        </div>
    );
}
