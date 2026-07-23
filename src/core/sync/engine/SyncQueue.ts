import type { SyncQueueItem } from "./types";

export class SyncQueue {
    private queue: SyncQueueItem[] = [];

    push(item: SyncQueueItem) {
        this.queue.push(item);
    }

    shift(): SyncQueueItem | undefined {
        return this.queue.shift();
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
