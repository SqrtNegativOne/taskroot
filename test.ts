const s: Set<(...args: never[]) => unknown> = new Set(); const fn = (_a: number) => {}; s.add(fn);
