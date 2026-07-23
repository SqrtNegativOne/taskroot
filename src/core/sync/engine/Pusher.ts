import { SyncQueue } from "./SyncQueue";
import { TaskSynchronizer } from "./TaskSynchronizer";
import { EventSynchronizer } from "./EventSynchronizer";
import { SyncType } from "./types";
import { syncState } from "../SyncState";

export class Pusher {
    private pushQueue = new SyncQueue();
    private taskSync: TaskSynchronizer;
    private eventSync: EventSynchronizer;
    private getSettings: () => any;

    constructor(
        taskSync: TaskSynchronizer,
        eventSync: EventSynchronizer,
        getSettings: () => any
    ) {
        this.taskSync = taskSync;
        this.eventSync = eventSync;
        this.getSettings = getSettings;
    }

    get queue() {
        return this.pushQueue;
    }

    trigger() {
        if (syncState.isPushing) return;
        this.processPushQueue();
    }

    private async processPushQueue() {
        if (this.pushQueue.length === 0) return;
        syncState.isPushing = true;

        const settings = this.getSettings();

        while (this.pushQueue.length > 0) {
            const taskOrEvent = this.pushQueue.peek()!;
            try {
                if (taskOrEvent.type === SyncType.Task && settings.enableTasksSync === false) {
                    this.pushQueue.shift();
                    continue;
                }
                if (taskOrEvent.type === SyncType.Event && settings.enableCalendarSync === false) {
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
                syncState.error = e.message || "Error syncing item to Google.";
                break;
            }
        }

        syncState.isPushing = false;
    }
}
