export function resolveConflict<T extends { id: string, updatedAt?: number }>(
    remoteItem: T | { id: string, _deleted?: boolean, updatedAt?: number },
    existingLocalItem: T | undefined,
    localItemsMap: Map<string, T>
): boolean {
    let updated = false;

    if ("_deleted" in remoteItem && remoteItem._deleted) {
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
            const newItem: T = remoteItem;
            localItemsMap.set(existingLocalItem.id, newItem);
            updated = true;
        }
    } else {
        const newItem: T = remoteItem;
        localItemsMap.set(remoteItem.id, newItem);
        updated = true;
    }
    
    return updated;
}
