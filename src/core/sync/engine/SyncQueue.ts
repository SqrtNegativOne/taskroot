import type { SyncQueueItem } from "./types";
import { SyncAction } from "./types";

export class SyncQueue {
    private queue: SyncQueueItem[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const saved = localStorage.getItem("taskroot_sync_queue");
            if (saved) {
                this.queue = JSON.parse(saved);
            }
        } catch (e) {
            console.error("Failed to load SyncQueue from localStorage", e);
            this.queue = [];
        }
    }

    private save() {
        try {
            localStorage.setItem("taskroot_sync_queue", JSON.stringify(this.queue));
        } catch (e) {
            console.error("Failed to save SyncQueue to localStorage", e);
        }
    }

    push(item: SyncQueueItem) {

        const existingIndex = this.queue.findIndex(
            (q) => q.type === item.type && q.item?.id === item.item?.id
        );

        // Brand new action
        if (existingIndex === -1) {
            if (item.action === SyncAction.Delete && !item.googleId) {
                // This item wasn't synced to Google yet, so we don't even need to add a delete action for it.
                return;
            }
            this.queue.push(item);
            this.save();
            return;
        }

        const existingAction = this.queue[existingIndex].action;
        const incomingAction = item.action;
        const transition = `${existingAction}->${incomingAction}`;

        switch (transition) {
            case `${SyncAction.Create}->${SyncAction.Create}`:
            case `${SyncAction.Update}->${SyncAction.Create}`:
                return;
            case `${SyncAction.Delete}->${SyncAction.Create}`:
                this.queue[existingIndex] = item;
                break;

            case `${SyncAction.Create}->${SyncAction.Update}`:
                this.queue[existingIndex].item = item.item;
                break;
            case `${SyncAction.Update}->${SyncAction.Update}`:
                this.queue[existingIndex] = item;
                break;
            case `${SyncAction.Delete}->${SyncAction.Update}`:
                console.warn("Attempted to update a deleted item. Ignoring.");
                return;

            case `${SyncAction.Create}->${SyncAction.Delete}`:
                this.queue.splice(existingIndex, 1);
                break;
            case `${SyncAction.Update}->${SyncAction.Delete}`:
                if (item.googleId) {
                    this.queue[existingIndex] = item;
                } else {
                    this.queue.splice(existingIndex, 1);
                }
                break;
            case `${SyncAction.Delete}->${SyncAction.Delete}`:
                return;
        }

        this.save();
    }

    shift(): SyncQueueItem | undefined {
        const item = this.queue.shift();
        if (item !== undefined) {
            this.save();
        }
        return item;
    }

    remove(item: SyncQueueItem) {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
            this.queue.splice(index, 1);
            this.save();
        }
    }

    peek(): SyncQueueItem | undefined {
        return this.queue.length > 0 ? this.queue[0] : undefined;
    }

    get length(): number {
        return this.queue.length;
    }

    getItems(): SyncQueueItem[] {
        return [...this.queue];
    }
}
