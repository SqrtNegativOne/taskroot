export type ClarifyAdvance = { index: number; done: boolean };

/**
 * Pure navigation step for the Clarify queue.
 * Returns the next index and whether the queue is exhausted.
 * Called by both onClarifyAccept and onClarifySkip so the transition
 * logic lives in exactly one place.
 */
export function advanceClarify(index: number, length: number): ClarifyAdvance {
  if (index < length - 1) return { index: index + 1, done: false };
  return { index, done: true };
}
