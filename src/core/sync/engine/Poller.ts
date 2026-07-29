import { MS_PER_SECOND, MINUTES_IN_HOUR } from "../../utils/constants";
import { syncState } from "../SyncState";
import { TaskSynchronizer } from "./TaskSynchronizer";
import { EventSynchronizer } from "./EventSynchronizer";
import { Pusher } from "./Pusher";

export const MIN_POLL_INTERVAL_MINUTES = 5;
export const LONG_PRESS_DELAY_MS = 1500;


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
                }, LONG_PRESS_DELAY_MS);
            }
        }

        syncState.nextSyncTime = Date.now() + (settings.syncInterval || MIN_POLL_INTERVAL_MINUTES) * MINUTES_IN_HOUR * MS_PER_SECOND;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime)
                this.poll();
        }, MS_PER_SECOND);

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
        syncState.nextSyncTime = Date.now() + (settings.syncInterval || MIN_POLL_INTERVAL_MINUTES) * MINUTES_IN_HOUR * MS_PER_SECOND;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime)
                this.poll();
        }, MS_PER_SECOND);
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
            syncState.nextSyncTime = Date.now() + (settings.syncInterval || MIN_POLL_INTERVAL_MINUTES) * MINUTES_IN_HOUR * MS_PER_SECOND;
            if (!syncState.initialSyncComplete) {
                syncState.initialSyncComplete = true;
            }
        }
    }
}
