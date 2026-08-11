import type { ISyncEngineContext, SyncQueueItem } from "./types";
import { SyncAction, SyncType } from "./types";
import { ResultAsync, okAsync } from "neverthrow";
import { toSyncError, type SyncError } from "../errors";

export interface ISyncStrategy<T extends { id: string; remoteId?: string | undefined; updatedAt?: number | undefined }> {
    isSyncEnabled(): boolean;
    getLocalItems(): T[];
    setLocalItems(items: T[]): void;
    getSyncType(): SyncType;
    updateOldMapSnapshot(items: T[]): void;
    fetchRemoteItems(): ResultAsync<unknown[] | undefined, SyncError>;
    processSingleRemoteItem(remote: unknown, localItemsArray: T[], localItemsMap: Map<string, T>): boolean;
    computeDelta(currentItems: T[]): void;
    processPushItem(item: SyncQueueItem): ResultAsync<void, SyncError>;
    extractItem(q: SyncQueueItem): T | undefined;
}

export class Synchronizer<T extends { id: string; remoteId?: string | undefined; updatedAt?: number | undefined }> {
    protected context: ISyncEngineContext;
    private strategy: ISyncStrategy<T>;

    constructor(context: ISyncEngineContext, strategy: ISyncStrategy<T>) {
        this.context = context;
        this.strategy = strategy;
    }

    isSyncEnabled(): boolean {
        return this.strategy.isSyncEnabled();
    }

    poll(): ResultAsync<void, SyncError> {
        if (!this.isSyncEnabled()) return okAsync(undefined);

        return ResultAsync.fromPromise(
            (async () => {
                const localItems = this.strategy.getLocalItems();
                this.strategy.updateOldMapSnapshot(localItems);
                
                const remoteItemsResult = await this.strategy.fetchRemoteItems();
                if (remoteItemsResult.isErr()) throw remoteItemsResult.error;
                const remoteItems = remoteItemsResult.value;
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
                    this.strategy.setLocalItems(newItems);
                    this.strategy.updateOldMapSnapshot(newItems);
                }
            })(),
            (e) => toSyncError(e)
        );
    }

    protected applyOptimisticOverlay(localItemsMap: Map<string, T>): boolean {
        let updated = false;
        for (const q of this.context.pushQueue.getItems()) {
            if (this.processQueueItem(q, localItemsMap)) {
                updated = true;
            }
        }
        return updated;
    }

    private processQueueItem(q: SyncQueueItem, localItemsMap: Map<string, T>): boolean {
        if (q.type !== this.strategy.getSyncType()) return false;
        
        if (q.action === SyncAction.Delete) {
            return this.applyQueueDelete(q, localItemsMap);
        } else if ((q.action === SyncAction.Update || q.action === SyncAction.Create || q.action === SyncAction.Move) && q.item?.id) {
            return this.applyQueueUpsert(q, localItemsMap);
        }
        return false;
    }

    private applyQueueDelete(q: SyncQueueItem, localItemsMap: Map<string, T>): boolean {
        let updated = false;
        if (q.item?.id) {
            localItemsMap.delete(q.item.id);
            updated = true;
        }
        if (q.remoteId) {
            for (const [key, item] of Array.from(localItemsMap.entries())) {
                if (item.remoteId === q.remoteId) {
                    localItemsMap.delete(key);
                    updated = true;
                }
            }
        }
        return updated;
    }

    private applyQueueUpsert(q: SyncQueueItem, localItemsMap: Map<string, T>): boolean {
        const existing = localItemsMap.get(q.item.id);
        if ((q.action === SyncAction.Update || q.action === SyncAction.Move) && q.updatedFields && existing) {
            const partialUpdate: Partial<T> = {};
            for (const field of q.updatedFields) {
                Object.defineProperty(partialUpdate, field, {
                    value: Reflect.get(q.item, field),
                    enumerable: true,
                    writable: true,
                    configurable: true,
                });
            }
            Object.defineProperty(partialUpdate, "updatedAt", {
                value: Math.max(q.item.updatedAt || 0, existing.updatedAt || 0),
                enumerable: true,
                writable: true,
                configurable: true,
            });
            localItemsMap.set(q.item.id, { ...existing, ...partialUpdate });
        } else {
            const extracted = this.strategy.extractItem(q);
            if (extracted) {
                localItemsMap.set(q.item.id, extracted);
            }
        }
        return true;
    }

    computeDelta(currentItems: T[]) {
        this.strategy.computeDelta(currentItems);
    }

    processPushItem(item: SyncQueueItem): ResultAsync<void, SyncError> {
        return this.strategy.processPushItem(item);
    }
}
