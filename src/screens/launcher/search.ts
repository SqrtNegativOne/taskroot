export function fuzzyScore(query: string, target: string): number {
  query = query.toLowerCase();
  target = target.toLowerCase();
  let qi = 0, score = 0, run = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      run++;
      score += 1 + run;                                   // reward consecutive hits
      if (ti === 0 || /[\s\-_]/.test(target[ti - 1])) score += 3; // word-boundary bonus
      qi++;
    } else {
      run = 0;
    }
  }
  return qi === query.length ? score : -1; // -1 = query chars weren't all found in order
}

export function search<T extends { label: string }>(query: string, items: T[], limit = 20): T[] {
  if (!query) return items.slice(0, limit);
  return items
    .map(item => ({ item, s: fuzzyScore(query, item.label) }))
    .filter(x => x.s > 0)
    .toSorted((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.item);
}
