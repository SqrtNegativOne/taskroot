import type { ISyncEngineContext, SyncQueueItem } from "./types";

export interface ISyncStrategy<T extends { id: string }> {
    isSyncEnabled(): boolean;
    getLocalStoreKey(): string;
    updatePrevMapSnapshot(items: T[]): void;
    fetchRemoteItems(): Promise<unknown[] | undefined>;
    processSingleRemoteItem(remote: unknown, localItemsArray: T[], localItemsMap: Map<string, T>): boolean;
    processQueueItem(q: SyncQueueItem, localItemsMap: Map<string, T>): boolean;
    computeDelta(newItems: T[]): void;
    processPushItem(item: SyncQueueItem): Promise<void>;
}

export class Synchronizer<T extends { id: string }> {
    protected context: ISyncEngineContext;
    private strategy: ISyncStrategy<T>;

    constructor(context: ISyncEngineContext, strategy: ISyncStrategy<T>) {
        this.context = context;
        this.strategy = strategy;
    }

    async poll() {
        if (!this.strategy.isSyncEnabled()) return;

        const localItems = this.context.getLocalData<T[]>(this.strategy.getLocalStoreKey());
        this.strategy.updatePrevMapSnapshot(localItems);

        const remoteItems = await this.strategy.fetchRemoteItems();
        if (!remoteItems) return;

        let updated = false;
        const localItemsMap = new Map<string, T>(localItems.map((item) => [item.id, item]));

        for (const remote of remoteItems) {
            if (this.strategy.processSingleRemoteItem(remote, localItems, localItemsMap)) {
                updated = true;
            }
        }

        if (this.applyOptimisticOverlay(localItemsMap)) {
            updated = true;
        }

        if (updated) {
            const newItems = Array.from(localItemsMap.values());
            this.context.setLocalData(this.strategy.getLocalStoreKey(), newItems);
            this.strategy.updatePrevMapSnapshot(newItems);
        }
    }

    protected applyOptimisticOverlay(localItemsMap: Map<string, T>): boolean {
        let updated = false;
        for (const q of this.context.pushQueue.getItems()) {
            if (this.strategy.processQueueItem(q, localItemsMap)) {
                updated = true;
            }
        }
        return updated;
    }

    computeDelta(newItems: T[]) {
        this.strategy.computeDelta(newItems);
    }

    processPushItem(item: SyncQueueItem) {
        return this.strategy.processPushItem(item);
    }
}
