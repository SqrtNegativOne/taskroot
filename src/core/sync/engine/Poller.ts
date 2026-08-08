import { MS_PER_SECOND, MINUTES_IN_HOUR } from "../../utils/constants";
import { syncState } from "../SyncState";
import type { Synchronizer } from "./Synchronizer";
import { Pusher } from "./Pusher";
import type { AppTask, AppEvent } from "../../domain/models";

export const MIN_POLL_INTERVAL_MINUTES = 5;
export const LONG_PRESS_DELAY_MS = 1500;


export class Poller {
    private pollInterval: ReturnType<typeof setInterval> | undefined = undefined;
    private taskSync: Synchronizer<AppTask>;
    private eventSync: Synchronizer<AppEvent>;
    private pusher: Pusher;
    private getSettings: () => Partial<import('../../store/settingsSchema').AppSettings>;
    private hasAuth: () => boolean;

    constructor(
        taskSync: Synchronizer<AppTask>,
        eventSync: Synchronizer<AppEvent>,
        pusher: Pusher,
        options: {
            getSettings: () => Partial<import('../../store/settingsSchema').AppSettings>;
            hasAuth: () => boolean;
        }
    ) {
        this.taskSync = taskSync;
        this.eventSync = eventSync;
        this.pusher = pusher;
        this.getSettings = options.getSettings;
        this.hasAuth = options.hasAuth;
    }

    start() {
        const offline = import.meta.env?.VITE_OFFLINE_MODE === "true";
        const settings = this.getSettings();
        if (offline || (settings.enableCalendarSync === false && settings.enableTasksSync === false))
            syncState.initialSyncComplete = true;

        if (this.pollInterval) return;

        if (this.hasAuth()) {
            void this.poll();
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
                void this.poll();
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
        void this.poll();
        const settings = this.getSettings();
        syncState.nextSyncTime = Date.now() + (settings.syncInterval || MIN_POLL_INTERVAL_MINUTES) * MINUTES_IN_HOUR * MS_PER_SECOND;
        this.pollInterval = setInterval(() => {
            if (Date.now() >= syncState.nextSyncTime)
                void this.poll();
        }, MS_PER_SECOND);
    }

    private handlePollError(e: Error) {
        console.error("Poller poll error:", e);
        if (e.message === "Unauthorized") {
            syncState.error = "Failed to refresh session. You may need to log out and log back in.";
        } else {
            syncState.error = e.message || "Error during synchronization";
        }
    }

    async poll() {
        if (syncState.isPolling) return;
        syncState.isPolling = true;
        syncState.error = undefined;

        const taskResult = await this.taskSync.poll();
        if (taskResult.isErr()) {
            this.handlePollError(taskResult.error);
        } else {
            const eventResult = await this.eventSync.poll();
            if (eventResult.isErr()) {
                this.handlePollError(eventResult.error);
            } else {
                this.pusher.trigger();
            }
        }

        syncState.isPolling = false;
        const settings = this.getSettings();
        syncState.nextSyncTime = Date.now() + (settings.syncInterval || MIN_POLL_INTERVAL_MINUTES) * MINUTES_IN_HOUR * MS_PER_SECOND;
        if (!syncState.initialSyncComplete) {
            syncState.initialSyncComplete = true;
        }
    }
}
