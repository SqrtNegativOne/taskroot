// A simple registry to let Sync modules update the local store (React state + localStorage)
const updaters = new Map<string, Set<(data: unknown) => void>>();

export const storeRegistry = {
    registerUpdater<T>(key: string, updater: (val: T) => void) {
        if (!updaters.has(key)) {
            updaters.set(key, new Set());
        }
        // We must use 'as' here because the Set holds heterogeneous callbacks that accept various types (T).
        updaters.get(key)!.add(updater as (data: unknown) => void);
        return () => {
            const set = updaters.get(key);
            // We must use 'as' here to identify the heterogeneous callback to delete it.
            if (set) set.delete(updater as (data: unknown) => void);
        };
    },
    
    setLocalData(key: string, data: unknown) {
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(data));
        const set = updaters.get(key);
        if (set) {
            set.forEach((updater) => updater(data));
        }
    },
    
    getLocalData(key: string) {
        try {
            const saved = localStorage.getItem(`taskroot_${key}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }
};
