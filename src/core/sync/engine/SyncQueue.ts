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

    // oxlint-disable-next-line eslint/complexity
    private handleTransition(
        transition: string, 
        item: SyncQueueItem, 
        existingIndices: number[],
        indices: { create: number, update: number, move: number }
    ) {
        const removeAllExisting = () => {
            for (const idx of [...existingIndices].toSorted((a, b) => b - a)) {
                this.queue.splice(idx, 1);
            }
       };

        switch (transition) {
            case "create->create":
            case "update->create":
            case "move->create":
            case "move+update->create":
                console.warn("Attempted to recreate an item that already exists in the queue.");
                return;
            case "delete->create":
                removeAllExisting();
                this.queue.push(item);
                break;

            case "create->update":
                this.queue[indices.create].item = item.item;
                break;
            case "update->update":
                this.queue[indices.update] = item;
                break;
            case "move->update":
                this.queue[indices.move].item = item.item;
                this.queue.push(item);
                break;
            case "move+update->update":
                this.queue[indices.move].item = item.item;
                this.queue.splice(indices.update, 1);
                this.queue.push(item);
                break;
            case "delete->update":
                console.warn("Attempted to update a deleted item. Ignoring.");
                return;

            case "create->move":
                this.queue[indices.create].item = item.item;
                break;
            case "update->move":
                this.queue[indices.update].item = item.item;
                this.queue.push(item);
                break;
            case "move->move":
                this.queue[indices.move] = item;
                break;
            case "move+update->move":
                this.queue[indices.update].item = item.item;
                this.queue[indices.move] = item;
                break;
            case "delete->move":
                console.warn("Attempted to move a deleted item. Ignoring.");
                return;

            case "create->delete":
                removeAllExisting();
                break;
            case "update->delete":
            case "move->delete":
            case "move+update->delete":
                removeAllExisting();
                if (item.googleId) this.queue.push(item);
                break;
            case "delete->delete":
                return;
        }
    }

    push(item: SyncQueueItem) {

        const existingIndices = this.queue
            .map((q, index) => (q.type === item.type && q.item?.id === item.item?.id ? index : -1))
            .filter((index) => index !== -1);

        // Brand new action
        if (existingIndices.length === 0) {
            if (item.action === SyncAction.Delete && !item.googleId) {
                // This item wasn't synced to Google yet, so we don't even need to add a delete action for it.
                return;
            }
            this.queue.push(item);
            this.save();
            return;
        }

        // Determine existing state
        let existingState = "";
        const indices = { create: -1, update: -1, move: -1, delete: -1 };

        for (const index of existingIndices) {
            const action = this.queue[index].action;
            if (action === SyncAction.Create) indices.create = index;
            if (action === SyncAction.Update) indices.update = index;
            if (action === SyncAction.Move) indices.move = index;
            if (action === SyncAction.Delete) indices.delete = index;
        }

        if (indices.create !== -1) existingState = "create";
        else if (indices.delete !== -1) existingState = "delete";
        else if (indices.update !== -1 && indices.move !== -1) existingState = "move+update";
        else if (indices.update !== -1) existingState = "update";
        else if (indices.move !== -1) existingState = "move";
        
        const transition = `${existingState}->${item.action}`;
        
        this.handleTransition(transition, item, existingIndices, indices);

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
