// A simple registry to let Sync modules update the local store (React state + localStorage)
const updaters = new Map<string, Set<(val: unknown) => void>>();

export const storeRegistry = {
    registerUpdater<T>(key: string, updater: (val: T) => void) {
        if (!updaters.has(key)) {
            updaters.set(key, new Set());
        }
        updaters.get(key)!.add(updater as (val: unknown) => void);
        return () => {
            const set = updaters.get(key);
            if (set) set.delete(updater as (val: unknown) => void);
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
