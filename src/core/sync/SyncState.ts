type Listener = () => void;

class SyncStateStore {
    private _isPolling = false;
    private _isPushing = false;
    private _error: string | undefined = undefined;
    private _info: string | undefined = undefined;
    private _initialSyncComplete = false;
    private _nextSyncTime = 0;

    private _isOffline = false;

    private listeners = new Set<Listener>();

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        this.listeners.forEach((l) => l());
    }

    get isPolling() { return this._isPolling; }
    set isPolling(val: boolean) {
        if (this._isPolling !== val) {
            this._isPolling = val;
            this.notify();
        }
    }

    get isPushing() { return this._isPushing; }
    set isPushing(val: boolean) {
        if (this._isPushing !== val) {
            this._isPushing = val;
            this.notify();
        }
    }

    get isOffline() { return this._isOffline; }
    set isOffline(val: boolean) {
        if (this._isOffline !== val) {
            this._isOffline = val;
            this.notify();
        }
    }

    get error() { return this._error; }
    set error(val: string | undefined) {
        if (this._error !== val) {
            this._error = val;
            if (!val) this.isOffline = false;
            this.notify();
        }
    }

    checkConnectivity() {
        fetch('https://www.googleapis.com/robots.txt', { mode: 'no-cors', cache: 'no-store' })
            .then(() => { this.isOffline = false; return undefined; })
            .catch(() => { this.isOffline = true; return undefined; });
    }

    get info() { return this._info; }
    set info(val: string | undefined) {
        if (this._info !== val) {
            this._info = val;
            this.notify();
        }
    }

    get initialSyncComplete() { return this._initialSyncComplete; }
    set initialSyncComplete(val: boolean) {
        if (this._initialSyncComplete !== val) {
            this._initialSyncComplete = val;
            this.notify();
        }
    }

    get nextSyncTime() { return this._nextSyncTime; }
    set nextSyncTime(val: number) {
        if (this._nextSyncTime !== val) {
            this._nextSyncTime = val;
            this.notify();
        }
    }

    getUiMessage(): string {
        if (this._error) return "Sync failed";
        if (this._isPolling && this._isPushing) return "Syncing...";
        if (this._isPolling) return "Syncing...";
        if (this._isPushing) return "Saving...";
        return "Sync complete";
    }

    getUiStatus(): string {
        if (this._error) {
            return this._isOffline ? "signal_wifi_off" : "sync_problem";
        }
        if (this._isPolling || this._isPushing) return "syncing";
        return "sync";
    }
}

export const syncState = new SyncStateStore();
