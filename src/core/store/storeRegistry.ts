// A simple registry to let Sync modules update the local store (React state + localStorage)
type BivariantUpdater = { bivariantHack(data: unknown): void }["bivariantHack"];
const updaters = new Map<string, Set<BivariantUpdater>>();

export const storeRegistry = {
    registerUpdater<T>(key: string, updater: (val: T) => void) {
        if (!updaters.has(key)) {
            updaters.set(key, new Set());
        }
        updaters.get(key)!.add(updater);
        return () => {
            const set = updaters.get(key);
            if (set) set.delete(updater);
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
