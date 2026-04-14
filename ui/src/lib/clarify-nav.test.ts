import { describe, it, expect } from 'vitest';
import { advanceClarify } from './clarify-nav';

describe('advanceClarify', () => {
  it('advances the index when items remain', () => {
    expect(advanceClarify(0, 3)).toEqual({ index: 1, done: false });
    expect(advanceClarify(1, 3)).toEqual({ index: 2, done: false });
  });

  it('signals done on the last item', () => {
    expect(advanceClarify(2, 3)).toEqual({ index: 2, done: true });
  });

  it('signals done on a single-item queue', () => {
    expect(advanceClarify(0, 1)).toEqual({ index: 0, done: true });
  });

  it('signals done on an empty queue', () => {
    expect(advanceClarify(0, 0)).toEqual({ index: 0, done: true });
  });
});
