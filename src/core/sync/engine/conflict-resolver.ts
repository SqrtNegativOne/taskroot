export function resolveConflict<T extends { id: string, updatedAt?: number }>(
    remoteItem: T & { _deleted?: boolean },
    existingLocalItem: T | null | undefined,
    localItemsMap: Map<string, T>
): boolean {
    let updated = false;

    if (remoteItem._deleted) {
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
            localItemsMap.set(existingLocalItem.id, remoteItem as T);
            updated = true;
        }
    } else {
        localItemsMap.set(remoteItem.id, remoteItem as T);
        updated = true;
    }
    
    return updated;
}
