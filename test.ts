const s: Set<(...args: never[]) => unknown> = new Set(); const fn = (a: number) => {}; s.add(fn);
