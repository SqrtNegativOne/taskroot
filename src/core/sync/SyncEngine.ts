import { googleCalendarAPI } from "./GoogleCalendarAPI";
import { googleTasksAPI } from "./GoogleTasksAPI";
import { fetchWithTimeout } from "../store/api";
import { SyncQueue } from "./engine/SyncQueue";
import { TaskSynchronizer } from "./engine/TaskSynchronizer";
import { EventSynchronizer } from "./engine/EventSynchronizer";
import type { ISyncEngineContext } from "./engine/types";
import { SyncType } from "./engine/types";
export { SyncType, SyncAction } from "./engine/types";

export class SyncEngine {
    private lastTasksSync = 0;
    private lastEventsSync = 0;
    private pollInterval: any = null;

    private prevTasksMap = new Map<string, any>();
    private prevEventsMap = new Map<string, any>();

    private updaters = new Map<string, Set<(val: any) => void>>();

    private pushQueue = new SyncQueue();

    private isPolling = false;
    private isPushing = false;

    private settings: any = { enableCalendarSync: true, enableTasksSync: true };

    private statusListeners = new Set<(status: string) => void>();
    private currentStatus = "sync";
    public nextSyncTime: number = 0;

    public initialSyncComplete = false;
    private initialSyncListeners = new Set<(c: boolean) => void>();
    private errorListeners = new Set<(msg: string) => void>();

    private syncMessageListeners = new Set<(msg: string) => void>();
    private currentSyncMessage = "";
    
    private infoListeners = new Set<(msg: string) => void>();
    
    private taskSync: TaskSynchronizer;
    private eventSync: EventSynchronizer;

    constructor() {
        const context: ISyncEngineContext = {
            getLocalData: this.getLocalData.bind(this),
            setLocalData: this.setLocalData.bind(this),
            prevTasksMap: this.prevTasksMap,
            prevEventsMap: this.prevEventsMap,
            updatePrevTasksMap: this.updatePrevTasksMap.bind(this),
            updatePrevEventsMap: this.updatePrevEventsMap.bind(this),
            getSettings: () => this.settings,
            pushQueue: this.pushQueue,
            notifyError: this.notifyError.bind(this),
            updateStatus: this.updateStatus.bind(this),
        };
        this.taskSync = new TaskSynchronizer(context);
        this.eventSync = new EventSynchronizer(context);
    }

    subscribeSyncMessage(listener: (msg: string) => void) {
        this.syncMessageListeners.add(listener);
        listener(this.currentSyncMessage);
        return () => this.syncMessageListeners.delete(listener);
    }

    private setSyncMessage(msg: string) {
        this.currentSyncMessage = msg;
        this.syncMessageListeners.forEach((l) => l(msg));
    }

    subscribeInitialSync(listener: (c: boolean) => void) {
        this.initialSyncListeners.add(listener);
        listener(this.initialSyncComplete);
        return () => this.initialSyncListeners.delete(listener);
    }

    subscribeError(listener: (msg: string) => void) {
        this.errorListeners.add(listener);
        return () => this.errorListeners.delete(listener);
    }

    private notifyError(msg: string) {
        this.errorListeners.forEach((l) => l(msg));
    }

    subscribeInfo(listener: (msg: string) => void) {
        this.infoListeners.add(listener);
        return () => this.infoListeners.delete(listener);
    }

    private notifyInfo(msg: string) {
        this.infoListeners.forEach((l) => l(msg));
    }

    subscribeStatus(listener: (status: string) => void) {
        this.statusListeners.add(listener);
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    }

    private updateStatus(problem: boolean = false, isSyncing: boolean = false) {
        // @ts-ignore
        const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === "true";
        if (offline || (this.settings.enableCalendarSync === false && this.settings.enableTasksSync === false)) {
            this.setStatus("sync_disabled");
        } else if (problem) {
            this.setStatus("sync_problem");
        } else if (isSyncing) {
            this.setStatus("syncing");
        } else {
            this.setStatus("sync");
        }
    }

    private setStatus(status: string) {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.statusListeners.forEach((l) => l(status));
        }
    }

    registerUpdater(key: string, updater: (val: any) => void) {
        if (!this.updaters.has(key)) {
            this.updaters.set(key, new Set());
        }
        this.updaters.get(key)!.add(updater);
        return () => {
            const set = this.updaters.get(key);
            if (set) set.delete(updater);
        };
    }

    setSettings(settings: any) {
        this.settings = settings || {};
        this.updateStatus();
    }

    start() {
        this.updateStatus();
        // @ts-ignore
        const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === "true";
        if (offline || (this.settings.enableCalendarSync === false && this.settings.enableTasksSync === false)) {
            this.initialSyncComplete = true;
            this.initialSyncListeners.forEach((l) => l(true));
        }

        if (this.pollInterval) return;

        const token = localStorage.getItem("google_access_token");
        const refreshToken = localStorage.getItem("google_refresh_token");
        if (token || refreshToken) {
            googleCalendarAPI.setToken(token);
            googleTasksAPI.setToken(token);
            this.poll();
        } else if (!this.initialSyncComplete) {
            this.initialSyncComplete = true;
            this.initialSyncListeners.forEach((l) => l(true));
            if (!offline && (this.settings.enableCalendarSync !== false || this.settings.enableTasksSync !== false)) {
                setTimeout(() => {
                    this.notifyError(
                        "Google Sync is paused: No authorization token found. Please log out and log in again to authorize Google Calendar & Tasks.",
                    );
                }, 1500);
            }
        }

        this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= this.nextSyncTime) {
                this.poll();
            }
        }, 1000);
        setInterval(() => {
            const token = localStorage.getItem("google_access_token");
            if (token && googleCalendarAPI.getToken() !== token) {
                googleCalendarAPI.setToken(token);
                googleTasksAPI.setToken(token);
                this.poll();
            }
        }, 2000);

        window.addEventListener("online", () => {
            this.notifyInfo("Network reconnected. Forcing sync.");
            this.isPolling = false;
            this.forceSync();
        });
    }

    forceSync() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.poll();
        this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= this.nextSyncTime) {
                this.poll();
            }
        }, 1000);
    }

    private getLocalData(key: string) {
        try {
            const saved = localStorage.getItem(`taskroot_${key}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    private setLocalData(key: string, data: any) {
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(data));
        const set = this.updaters.get(key);
        if (set) {
            set.forEach((updater) => updater(data));
        }
    }

    private isRefreshing = false;

    private async refreshAccessToken(): Promise<boolean> {
        const refreshToken = localStorage.getItem("google_refresh_token");
        if (!refreshToken) return false;

        try {
            // @ts-ignore
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            // @ts-ignore
            const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

            const params = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            });

            const res = await fetchWithTimeout(
                "https://oauth2.googleapis.com/token",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: params.toString(),
                },
            );
            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem("google_access_token", data.access_token);
                googleCalendarAPI.setToken(data.access_token);
                googleTasksAPI.setToken(data.access_token);
                return true;
            }
        } catch (e) {
            console.error("Failed to refresh token", e);
        }
        return false;
    }

    async poll() {
        if (this.isPolling) return;
        this.isPolling = true;
        this.updateStatus(false, true); 
        this.setSyncMessage("Starting sync...");

        try {
            this.setSyncMessage("Syncing Google Tasks...");
            await this.taskSync.pollTasks();
            this.setSyncMessage("Syncing Google Calendar...");
            await this.eventSync.pollEvents();
            this.setSyncMessage("Pushing local changes...");
            await this.processPushQueue();
            this.updateStatus(false, false);
            this.setSyncMessage("Sync complete");
        } catch (e: any) {
            if (e.message === "Unauthorized" && !this.isRefreshing) {
                this.setSyncMessage("Refreshing access token...");
                this.notifyInfo("Google Session expired. Automatically refreshing access token...");
                this.isRefreshing = true;
                const refreshed = await this.refreshAccessToken();
                this.isRefreshing = false;

                if (refreshed) {
                    this.notifyInfo("Token refreshed securely! Resuming background sync.");
                    this.isPolling = false;
                    return await this.poll();
                } else {
                    this.notifyError("Failed to refresh Google session. You may need to log out and log back in.");
                }
            }

            console.error("SyncEngine poll error:", e);
            this.updateStatus(true, false);
            this.notifyError(e.message || "Error during synchronization");
            this.setSyncMessage("Sync failed");
        } finally {
            this.isPolling = false;
            this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
            if (!this.initialSyncComplete) {
                this.initialSyncComplete = true;
                this.initialSyncListeners.forEach((l) => l(true));
            }
        }
    }

    notifyDataChanged(key: string, newList: any[]) {
        if (key === "tasks") {
            this.taskSync.computeTasksDelta(newList);
        } else if (key === "events") {
            this.eventSync.computeEventsDelta(newList);
        }
        this.triggerPushQueue();
    }

    private updatePrevTasksMap(tasks: any[]) {
        this.prevTasksMap.clear();
        for (const t of tasks) {
            this.prevTasksMap.set(t.id, { ...t });
        }
    }

    private updatePrevEventsMap(events: any[]) {
        this.prevEventsMap.clear();
        for (const e of events) {
            this.prevEventsMap.set(e.id, { ...e });
        }
    }

    private triggerPushQueue() {
        if (this.isPushing) return;
        this.processPushQueue();
    }

    private async processPushQueue() {
        if (this.pushQueue.length === 0) return;
        this.isPushing = true;

        while (this.pushQueue.length > 0) {
            const taskOrEvent = this.pushQueue.peek()!;
            try {
                if (taskOrEvent.type === SyncType.Task && this.settings.enableTasksSync === false) {
                    this.pushQueue.shift();
                    continue;
                }
                if (taskOrEvent.type === SyncType.Event && this.settings.enableCalendarSync === false) {
                    this.pushQueue.shift();
                    continue;
                }

                if (taskOrEvent.type === SyncType.Task) {
                    await this.taskSync.processPushItem(taskOrEvent);
                } else if (taskOrEvent.type === SyncType.Event) {
                    await this.eventSync.processPushItem(taskOrEvent);
                }
                this.pushQueue.shift();
            } catch (e: any) {
                console.error("Push failed, keeping in queue", e);
                this.updateStatus(true);
                this.notifyError(e.message || "Error syncing item to Google.");
                break;
            }
        }

        this.isPushing = false;
    }
}

export const syncEngine = new SyncEngine();
