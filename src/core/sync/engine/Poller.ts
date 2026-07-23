import { syncState } from "../SyncState";
import { TaskSynchronizer } from "./TaskSynchronizer";
import { EventSynchronizer } from "./EventSynchronizer";
import { Pusher } from "./Pusher";
import { googleCalendarAPI } from "../GoogleCalendarAPI";
import { googleTasksAPI } from "../GoogleTasksAPI";

export class Poller {
    private pollInterval: any = null;
    private taskSync: TaskSynchronizer;
    private eventSync: EventSynchronizer;
    private pusher: Pusher;
    private getSettings: () => any;

    constructor(
        taskSync: TaskSynchronizer,
        eventSync: EventSynchronizer,
        pusher: Pusher,
        getSettings: () => any
    ) {
        this.taskSync = taskSync;
        this.eventSync = eventSync;
        this.pusher = pusher;
        this.getSettings = getSettings;
    }

    start() {
        // @ts-ignore
        const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === "true";
        const settings = this.getSettings();
        if (offline || (settings.enableCalendarSync === false && settings.enableTasksSync === false)) {
            syncState.initialSyncComplete = true;
        }

        if (this.pollInterval) return;

        const token = localStorage.getItem("google_access_token");
        const refreshToken = localStorage.getItem("google_refresh_token");
        if (token || refreshToken) {
            if (token) {
                googleCalendarAPI.setToken(token);
                googleTasksAPI.setToken(token);
            }
            this.poll();
        } else if (!syncState.initialSyncComplete) {
            syncState.initialSyncComplete = true;
            if (!offline && (settings.enableCalendarSync !== false || settings.enableTasksSync !== false)) {
                setTimeout(() => {
                    syncState.error = "Google Sync is paused: No authorization token found. Please log out and log in again to authorize Google Calendar & Tasks.";
                }, 1500);
            }
        }

        syncState.nextSyncTime = Date.now() + (settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime) {
                this.poll();
            }
        }, 1000);
        
        setInterval(() => {
            const currentToken = localStorage.getItem("google_access_token");
            if (currentToken && googleCalendarAPI.getToken() !== currentToken) {
                googleCalendarAPI.setToken(currentToken);
                googleTasksAPI.setToken(currentToken);
                this.poll();
            }
        }, 2000);

        window.addEventListener("online", () => {
            syncState.info = "Network reconnected. Forcing sync.";
            syncState.isPolling = false;
            this.forceSync();
        });
    }

    forceSync() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.poll();
        const settings = this.getSettings();
        syncState.nextSyncTime = Date.now() + (settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime) {
                this.poll();
            }
        }, 1000);
    }

    async poll() {
        if (syncState.isPolling) return;
        syncState.isPolling = true;
        syncState.error = null;

        try {
            await this.taskSync.pollTasks();
            await this.eventSync.pollEvents();
            this.pusher.trigger();
        } catch (e: any) {
            console.error("Poller poll error:", e);
            if (e.message !== "Unauthorized") {
                syncState.error = e.message || "Error during synchronization";
            } else {
                // If token bouncer couldn't refresh, it throws Unauthorized
                syncState.error = "Failed to refresh Google session. You may need to log out and log back in.";
            }
        } finally {
            syncState.isPolling = false;
            const settings = this.getSettings();
            syncState.nextSyncTime = Date.now() + (settings.syncInterval || 5) * 60 * 1000;
            if (!syncState.initialSyncComplete) {
                syncState.initialSyncComplete = true;
            }
        }
    }
}
