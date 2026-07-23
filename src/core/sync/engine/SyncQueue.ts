import type { SyncQueueItem } from "./types";

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
        this.queue.push(item);
        this.save();
    }

    shift(): SyncQueueItem | undefined {
        const item = this.queue.shift();
        if (item !== undefined) {
            this.save();
        }
        return item;
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
