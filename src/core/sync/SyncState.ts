type Listener = () => void;

class SyncStateStore {
    private _isPolling = false;
    private _isPushing = false;
    private _error: string | null = null;
    private _info: string | null = null;
    private _initialSyncComplete = false;
    private _nextSyncTime = 0;

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

    get error() { return this._error; }
    set error(val: string | null) {
        if (this._error !== val) {
            this._error = val;
            this.notify();
        }
    }

    get info() { return this._info; }
    set info(val: string | null) {
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
        if (this._error) return "sync_problem";
        if (this._isPolling || this._isPushing) return "syncing";
        return "sync";
    }
}

export const syncState = new SyncStateStore();
