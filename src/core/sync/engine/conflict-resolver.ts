function isNotDeleted<T extends object>(item: T | { id: string, _deleted?: boolean | undefined, updatedAt?: number | undefined }): item is T {
    return !("_deleted" in item && item._deleted);
}

export function resolveConflict<T extends { id: string, updatedAt?: number | undefined }>(
    remoteItem: T | { id: string, _deleted?: boolean | undefined, updatedAt?: number | undefined },
    existingLocalItem: T | undefined,
    localItemsMap: Map<string, T>
): boolean {
    let updated = false;

    if (!isNotDeleted(remoteItem)) {
        if (existingLocalItem) {
            const localUpdated = existingLocalItem.updatedAt || 0;
            if ((remoteItem.updatedAt || 0) > localUpdated) {
                localItemsMap.delete(existingLocalItem.id);
                updated = true;
            }
        }
        return updated;
    }

    if (existingLocalItem) {
        const localUpdated = existingLocalItem.updatedAt || 0;
        const remoteUpdated = remoteItem.updatedAt || 0;

        if (remoteUpdated > localUpdated) {
            localItemsMap.set(existingLocalItem.id, remoteItem);
            updated = true;
        }
    } else {
        localItemsMap.set(remoteItem.id, remoteItem);
        updated = true;
    }
    
    return updated;
}
