import { syncState } from "../SyncState";
import { TaskSynchronizer } from "./TaskSynchronizer";
import { EventSynchronizer } from "./EventSynchronizer";
import { Pusher } from "./Pusher";

export class Poller {
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private taskSync: TaskSynchronizer;
    private eventSync: EventSynchronizer;
    private pusher: Pusher;
    private getSettings: () => Partial<import('../../store/settingsSchema').AppSettings>;
    private hasAuth: () => boolean;

    constructor(
        taskSync: TaskSynchronizer,
        eventSync: EventSynchronizer,
        pusher: Pusher,
        getSettings: () => Partial<import('../../store/settingsSchema').AppSettings>,
        hasAuth: () => boolean
    ) {
        this.taskSync = taskSync;
        this.eventSync = eventSync;
        this.pusher = pusher;
        this.getSettings = getSettings;
        this.hasAuth = hasAuth;
    }

    start() {
        const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === "true";
        const settings = this.getSettings();
        if (offline || (settings.enableCalendarSync === false && settings.enableTasksSync === false))
            syncState.initialSyncComplete = true;

        if (this.pollInterval) return;

        if (this.hasAuth()) {
            this.poll();
        } else if (!syncState.initialSyncComplete) {
            syncState.initialSyncComplete = true;
            if (!offline && (settings.enableCalendarSync !== false || settings.enableTasksSync !== false)) {
                setTimeout(() => {
                    syncState.error = "Sync is paused: No authorization token found. Please log out and log in again to authorize.";
                }, 1500);
            }
        }

        syncState.nextSyncTime = Date.now() + (settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime)
                this.poll();
        }, 1000);

        window.addEventListener("online", () => {
            syncState.info = "Network reconnected. Forcing sync.";
            syncState.isPolling = false;
            this.forceSync();
        });
    }

    forceSync() {
        if (this.pollInterval)
            clearInterval(this.pollInterval);
        this.poll();
        const settings = this.getSettings();
        syncState.nextSyncTime = Date.now() + (settings.syncInterval || 5) * 60 * 1000;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime)
                this.poll();
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
        } catch (e: unknown) {
            console.error("Poller poll error:", e);
            if (e instanceof Error && e.message === "Unauthorized") {
                // If token bouncer couldn't refresh, it throws Unauthorized
                syncState.error = "Failed to refresh session. You may need to log out and log back in.";
            } else if (e instanceof Error) {
                syncState.error = e.message || "Error during synchronization";
            } else {
                syncState.error = "Error during synchronization";
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
