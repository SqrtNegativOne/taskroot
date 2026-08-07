import { SyncQueue } from "./SyncQueue";
import type { Synchronizer } from "./Synchronizer";
import { SyncType } from "./types";
import { syncState } from "../SyncState";
import { ConflictError } from "../errors";
import type { AppTask, AppEvent } from "../../domain/models";

export class Pusher {
    private pushQueue = new SyncQueue();
    private synchronizers: Record<string, Synchronizer<unknown & { id: string }>> = {};

    constructor(
        taskSync: Synchronizer<AppTask>,
        eventSync: Synchronizer<AppEvent>
    ) {
        this.synchronizers = {
            [SyncType.Task]: taskSync,
            [SyncType.Event]: eventSync,
        };
    }

    get queue() {
        return this.pushQueue;
    }

    trigger() {
        if (syncState.isPushing) return;
        void this.processPushQueue();
    }

    private async processPushQueue() {
        if (this.pushQueue.length === 0) return;
        syncState.isPushing = true;

        while (this.pushQueue.length > 0) {
            const taskOrEvent = this.pushQueue.peek();
            if (!taskOrEvent) {
                this.pushQueue.shift();
                continue;
            }
            try {
                const sync = this.synchronizers[taskOrEvent.type];
                if (!sync || !sync.isSyncEnabled()) {
                    this.pushQueue.remove(taskOrEvent);
                    continue;
                }
                
                // eslint-disable-next-line no-await-in-loop
                await sync.processPushItem(taskOrEvent);
                this.pushQueue.remove(taskOrEvent);
            } catch (e: unknown) {
                if (e instanceof ConflictError) {
                    console.warn(`ETag conflict on push: ${e.message}. Dropping push to let poller resolve.`);
                    this.pushQueue.remove(taskOrEvent);
                    continue;
                }

                console.error("Push failed", e);
                if (e instanceof Error && (e.message.includes("403") || e.message.includes("404") || e.message.includes("400"))) {
                    this.pushQueue.remove(taskOrEvent);
                    const itemName = taskOrEvent.item.title || "Unknown item";
                    syncState.error = `Sync ${taskOrEvent.action} item "${itemName}" discarded because of error: ${e.message}`;
                    continue;
                }
                
                syncState.error = e instanceof Error ? e.message : "Error syncing item to Google.";
                break;
            }
        }

        syncState.isPushing = false;
    }
}
