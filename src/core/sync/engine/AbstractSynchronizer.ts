import type { ISyncEngineContext, SyncQueueItem } from "./types";

export abstract class AbstractSynchronizer<T extends { id: string }> {
    protected context: ISyncEngineContext;

    constructor(context: ISyncEngineContext) {
        this.context = context;
    }

    /**
     * Orchestrates the pull/poll cycle.
     * Uses the Template Method design pattern.
     */
    async poll() {
        if (!this.isSyncEnabled()) return;

        const localItems = this.context.getLocalData<T[]>(this.getLocalStoreKey());
        this.updatePrevMapSnapshot(localItems);

        const remoteItems = await this.fetchRemoteItems();
        if (!remoteItems) return;

        let updated = false;
        const localItemsMap = new Map<string, T>(localItems.map((item) => [item.id, item]));

        for (const remote of remoteItems) {
            if (this.processSingleRemoteItem(remote, localItems, localItemsMap)) {
                updated = true;
            }
        }

        // --- Optimistic Overlay ---
        if (this.applyOptimisticOverlay(localItemsMap)) {
            updated = true;
        }

        if (updated) {
            const newItems = Array.from(localItemsMap.values());
            this.context.setLocalData(this.getLocalStoreKey(), newItems);
            this.updatePrevMapSnapshot(newItems);
        }
    }

    /**
     * Applies pending queue changes on top of the remote state
     * to prevent local overwrites while awaiting a push.
     */
    protected applyOptimisticOverlay(localItemsMap: Map<string, T>): boolean {
        let updated = false;
        for (const q of this.context.pushQueue.getItems()) {
            if (this.processQueueItem(q, localItemsMap)) {
                updated = true;
            }
        }
        return updated;
    }

    // ==========================================
    // Hooks for Subclasses (Template Methods)
    // ==========================================

    /** Checks if sync is enabled in user settings for this domain */
    protected abstract isSyncEnabled(): boolean;

    /** The key used in local storage (e.g., "tasks" or "events") */
    protected abstract getLocalStoreKey(): string;

    /** Updates the memory snapshot of the data used for computing deltas */
    protected abstract updatePrevMapSnapshot(items: T[]): void;

    /** Fetches the raw remote items from the respective API */
    protected abstract fetchRemoteItems(): Promise<any[] | undefined>;

    /** 
     * Reconciles a single remote item with the local state.
     * @returns true if the local map was updated
     */
    protected abstract processSingleRemoteItem(remote: any, localItemsArray: T[], localItemsMap: Map<string, T>): boolean;

    /**
     * Resolves a queued action (Create/Update/Delete) against the local map.
     * @returns true if the local map was updated
     */
    protected abstract processQueueItem(q: SyncQueueItem, localItemsMap: Map<string, T>): boolean;

    /**
     * Compares new local state to the snapshot to generate SyncQueue actions.
     */
    abstract computeDelta(newItems: T[]): void;

    /**
     * Executes a queued push action to the remote API.
     */
    abstract processPushItem(item: SyncQueueItem): Promise<void>;
}
