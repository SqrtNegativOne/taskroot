import type { SyncQueueItem } from "./types";
import { SyncAction } from "./types";
import { Result, ok } from "neverthrow";

const safeGetItem = Result.fromThrowable(
    (key: string) => localStorage.getItem(key),
    (e) => e instanceof Error ? e : new Error(String(e))
);

const safeParse = Result.fromThrowable(
    JSON.parse,
    (e) => e instanceof Error ? e : new Error(String(e))
);

const safeStringify = Result.fromThrowable(
    JSON.stringify,
    (e) => e instanceof Error ? e : new Error(String(e))
);

const safeSetItem = Result.fromThrowable(
    (key: string, value: string) => localStorage.setItem(key, value),
    (e) => e instanceof Error ? e : new Error(String(e))
);

export class SyncQueue {
    private queue: SyncQueueItem[] = [];

    constructor() {
        this.load();
    }

    private load() {
        safeGetItem("taskroot_sync_queue")
            .andThen((saved) => (saved ? safeParse(saved) : ok(undefined)))
            .map((parsed) => {
                if (parsed) this.queue = parsed;
            })
            .mapErr((e) => {
                console.error("Failed to load SyncQueue from localStorage", e);
                this.queue = [];
            });
    }

    private save() {
        safeStringify(this.queue)
            .andThen((stringified) => safeSetItem("taskroot_sync_queue", stringified))
            .mapErr((e) => {
                console.error("Failed to save SyncQueue to localStorage", e);
            });
    }

    private handleUpdateTransition(transition: string, item: SyncQueueItem, indices: { create: number, update: number, move: number }) {
        if (transition === "create->update") {
            const q = this.queue[indices.create];
            if (q) q.item = item.item;
        } else if (transition === "update->update") {
            this.queue[indices.update] = item;
        } else if (transition === "move->update") {
            const q = this.queue[indices.move];
            if (q) q.item = item.item;
            this.queue.push(item);
        } else if (transition === "move+update->update") {
            const q = this.queue[indices.move];
            if (q) q.item = item.item;
            this.queue.splice(indices.update, 1);
            this.queue.push(item);
        } else if (transition === "delete->update") {
            console.warn("Attempted to update a deleted item. Ignoring.");
        }
    }

    private handleMoveTransition(transition: string, item: SyncQueueItem, indices: { create: number, update: number, move: number }) {
        if (transition === "create->move") {
            const q = this.queue[indices.create];
            if (q) q.item = item.item;
        } else if (transition === "update->move") {
            const q = this.queue[indices.update];
            if (q) q.item = item.item;
            this.queue.push(item);
        } else if (transition === "move->move") {
            this.queue[indices.move] = item;
        } else if (transition === "move+update->move") {
            const q = this.queue[indices.update];
            if (q) q.item = item.item;
            this.queue[indices.move] = item;
        } else if (transition === "delete->move") {
            console.warn("Attempted to move a deleted item. Ignoring.");
        }
    }

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

        if (item.action === SyncAction.Create) {
            if (transition === "delete->create") {
                removeAllExisting();
                this.queue.push(item);
            } else {
                console.warn("Attempted to recreate an item that already exists in the queue.");
            }
        } else if (item.action === SyncAction.Update) {
            this.handleUpdateTransition(transition, item, indices);
        } else if (item.action === SyncAction.Move) {
            this.handleMoveTransition(transition, item, indices);
        } else if (item.action === SyncAction.Delete) {
            if (transition === "delete->delete") return;
            removeAllExisting();
            if (transition !== "create->delete" && item.remoteId) {
                this.queue.push(item);
            }
        }
    }

    private determineExistingState(indices: { create: number, update: number, move: number, delete: number }) {
        if (indices.create !== -1) return "create";
        if (indices.delete !== -1) return "delete";
        if (indices.update !== -1 && indices.move !== -1) return "move+update";
        if (indices.update !== -1) return "update";
        if (indices.move !== -1) return "move";
        return "";
    }

    private updateIndicesForExisting(i: number, action: SyncAction, existingIndices: number[], indices: { create: number, update: number, move: number, delete: number }) {
        existingIndices.push(i);
        switch (action) {
            case SyncAction.Create: indices.create = i; break;
            case SyncAction.Update: indices.update = i; break;
            case SyncAction.Move: indices.move = i; break;
            case SyncAction.Delete: indices.delete = i; break;
        }
    }

    private getExistingIndicesAndStates(item: SyncQueueItem) {
        const existingIndices: number[] = [];
        const indices = { create: -1, update: -1, move: -1, delete: -1 };
        
        for (let i = 0; i < this.queue.length; i++) {
            const q = this.queue[i];
            if (!q) continue;
            if (q.type === item.type && q.item?.id === item.item?.id) {
                this.updateIndicesForExisting(i, q.action, existingIndices, indices);
            }
        }
        return { existingIndices, indices };
    }

    push(item: SyncQueueItem) {
        const { existingIndices, indices } = this.getExistingIndicesAndStates(item);

        if (existingIndices.length === 0) {
            if (item.action === SyncAction.Delete && !item.remoteId) {
                return;
            }
            this.queue.push(item);
            this.save();
            return;
        }

        const existingState = this.determineExistingState(indices);
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

    clear() {
        this.queue = [];
        this.save();
    }
}
