// A simple registry to let Sync modules update the local store (React state + localStorage)
const updaters = new Map<string, Set<(val: any) => void>>();

export const storeRegistry = {
    registerUpdater(key: string, updater: (val: any) => void) {
        if (!updaters.has(key)) {
            updaters.set(key, new Set());
        }
        updaters.get(key)!.add(updater);
        return () => {
            const set = updaters.get(key);
            if (set) set.delete(updater);
        };
    },
    
    setLocalData(key: string, data: any) {
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
