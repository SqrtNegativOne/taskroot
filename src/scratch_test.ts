type BivariantUpdater = { bivariantHack(data: unknown): void }["bivariantHack"];

const updaters = new Map<string, Set<BivariantUpdater>>();

function register<T>(key: string, cb: (val: T) => void) {
    if (!updaters.has(key)) updaters.set(key, new Set());
    updaters.get(key)!.add(cb); 
}

function call(key: string, data: unknown) {
    const set = updaters.get(key);
    if (set) {
        set.forEach(cb => cb(data)); // does this work?
    }
}
