/**
 * Tests for the smart-input parser.
 *
 * All date assertions are pinned to NOW = 2026-04-12 (Sunday) so the suite
 * stays green forever. Pass `now` explicitly to every parseTask call.
 */

import { describe, it, expect } from 'vitest';
import { parseTask } from './parser';
import type { ParsedTask, TokenType } from './parser';

// Sunday 2026-04-12 at noon UTC — stable anchor for all relative-date tests
const NOW = new Date('2026-04-12T12:00:00Z');

// ─── helpers ─────────────────────────────────────────────────────────────────

function tokenTypes(result: ParsedTask): TokenType[] {
  return result.tokens.map((t) => t.type);
}

function tokenOf(result: ParsedTask, type: TokenType) {
  return result.tokens.find((t) => t.type === type);
}

// ─── clean title ─────────────────────────────────────────────────────────────

describe('clean title', () => {
  it('leaves plain text untouched', () => {
    const r = parseTask('Write tests', { now: NOW });
    expect(r.title).toBe('Write tests');
    expect(r.tokens).toHaveLength(0);
  });

  it('strips a matched token and trims whitespace', () => {
    const r = parseTask('Write tests tomorrow', { now: NOW });
    expect(r.title).toBe('Write tests');
  });

  it('strips multiple tokens and collapses internal spaces', () => {
    const r = parseTask('Write tests tomorrow for 30m', { now: NOW });
    expect(r.title).toBe('Write tests');
  });

  it('uppercases the first letter of the remaining title', () => {
    const r = parseTask('write tests tomorrow', { now: NOW });
    expect(r.title[0]).toBe('W');
  });

  it('preserves original casing after the first char', () => {
    const r = parseTask('writeTests tomorrow', { now: NOW });
    expect(r.title).toBe('WriteTests');
  });
});

// ─── date aliases ─────────────────────────────────────────────────────────────

describe('date aliases', () => {
  const cases: [string, string][] = [
    ['today',      '2026-04-12'],
    ['tod',        '2026-04-12'],
    ['tomorrow',   '2026-04-13'],
    ['tom',        '2026-04-13'],
    ['tmrw',       '2026-04-13'],
    ['tmr',        '2026-04-13'],
    ['overmorrow', '2026-04-14'],
  ];

  for (const [alias, expected] of cases) {
    it(`"${alias}" → ${expected}`, () => {
      const r = parseTask(`Fix bug ${alias}`, { now: NOW });
      const tok = tokenOf(r, 'work_date');
      expect(tok?.value).toBe(expected);
    });
  }

  it('eod resolves to today', () => {
    const r = parseTask('Review PR eod', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-12');
  });
});

// ─── weekday aliases ──────────────────────────────────────────────────────────

describe('weekday aliases', () => {
  // NOW is Sunday (0). Next Monday = 2026-04-13, next Friday = 2026-04-17.
  it('"mon" resolves to next Monday', () => {
    const r = parseTask('Fix bug mon', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-13');
  });

  it('"friday" resolves to next Friday', () => {
    const r = parseTask('Fix bug friday', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-17');
  });

  it('"sun" resolves to next Sunday (skips today)', () => {
    // TODAY is Sunday; "next Sunday" should be 2026-04-19
    const r = parseTask('Fix bug sun', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-19');
  });

  it('"wed" resolves to next Wednesday', () => {
    const r = parseTask('Fix bug wed', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-15');
  });
});

// ─── relative date expressions ────────────────────────────────────────────────

describe('relative date expressions', () => {
  it('"in 3 days"', () => {
    const r = parseTask('Do thing in 3 days', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-15');
  });

  it('"in 1 week"', () => {
    const r = parseTask('Do thing in 1 week', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-19');
  });

  it('"next week" resolves to next Monday', () => {
    const r = parseTask('Do thing next week', { now: NOW });
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-13');
  });
});

// ─── deadline ────────────────────────────────────────────────────────────────

describe('deadline token', () => {
  it('"by friday" creates a deadline token, not a work_date', () => {
    const r = parseTask('Submit report by friday', { now: NOW });
    expect(tokenTypes(r)).toContain('deadline');
    expect(tokenTypes(r)).not.toContain('work_date');
    expect(tokenOf(r, 'deadline')?.value).toBe('2026-04-17');
  });

  it('"by tomorrow" parses correctly', () => {
    const r = parseTask('Submit PR by tomorrow', { now: NOW });
    expect(tokenOf(r, 'deadline')?.value).toBe('2026-04-13');
  });

  it('"by tom" uses the alias', () => {
    const r = parseTask('File ticket by tom', { now: NOW });
    expect(tokenOf(r, 'deadline')?.value).toBe('2026-04-13');
  });

  it('"by friday" does not bleed "friday" into work_date', () => {
    const r = parseTask('Submit report by friday', { now: NOW });
    expect(tokenTypes(r)).not.toContain('work_date');
  });
});

// ─── duration ─────────────────────────────────────────────────────────────────

describe('duration token', () => {
  it('"for 30m" → 30 minutes', () => {
    const r = parseTask('Write tests for 30m', { now: NOW });
    expect(tokenOf(r, 'duration')?.value).toBe(30);
  });

  it('"for 1h" → 60 minutes', () => {
    const r = parseTask('Write tests for 1h', { now: NOW });
    expect(tokenOf(r, 'duration')?.value).toBe(60);
  });

  it('"for 1h30m" → 90 minutes', () => {
    const r = parseTask('Write tests for 1h30m', { now: NOW });
    expect(tokenOf(r, 'duration')?.value).toBe(90);
  });

  it('"for 2h15m" → 135 minutes', () => {
    const r = parseTask('Write tests for 2h15m', { now: NOW });
    expect(tokenOf(r, 'duration')?.value).toBe(135);
  });
});

// ─── low-thought flag ─────────────────────────────────────────────────────────

describe('low_thought token', () => {
  it('"~" prefix marks the task as low-thought', () => {
    const r = parseTask('~ Reply to email', { now: NOW });
    expect(tokenOf(r, 'low_thought')?.value).toBe(true);
    // tilde should not bleed into the title
    expect(r.title).not.toMatch(/~/);
  });

  it('no tilde → no low_thought token', () => {
    const r = parseTask('Reply to email', { now: NOW });
    expect(tokenTypes(r)).not.toContain('low_thought');
  });
});

// ─── token span indices ───────────────────────────────────────────────────────

describe('token span indices', () => {
  it('start/end point at the matched substring in the raw string', () => {
    const raw = 'Write tests tomorrow';
    const r = parseTask(raw, { now: NOW });
    const tok = tokenOf(r, 'work_date')!;
    expect(raw.slice(tok.start, tok.end)).toBe('tomorrow');
  });

  it('deadline span covers "by <date>"', () => {
    const raw = 'Submit report by friday';
    const r = parseTask(raw, { now: NOW });
    const tok = tokenOf(r, 'deadline')!;
    expect(raw.slice(tok.start, tok.end)).toBe('by friday');
  });

  it('duration span covers "for <amount>"', () => {
    const raw = 'Write tests for 30m';
    const r = parseTask(raw, { now: NOW });
    const tok = tokenOf(r, 'duration')!;
    expect(raw.slice(tok.start, tok.end)).toBe('for 30m');
  });
});

// ─── overlap / priority ───────────────────────────────────────────────────────

describe('overlap resolution', () => {
  it('"by overmorrow" is a deadline, not two separate tokens', () => {
    const r = parseTask('File ticket by overmorrow', { now: NOW });
    expect(tokenTypes(r)).toContain('deadline');
    expect(tokenTypes(r)).not.toContain('work_date');
    expect(tokenOf(r, 'deadline')?.value).toBe('2026-04-14');
  });

  it('a work_date and deadline can coexist on different spans', () => {
    const r = parseTask('Do thing tomorrow by friday', { now: NOW });
    expect(tokenTypes(r)).toContain('work_date');
    expect(tokenTypes(r)).toContain('deadline');
  });

  it('no duplicate tokens for the same span', () => {
    const r = parseTask('Do thing tomorrow', { now: NOW });
    const workDates = r.tokens.filter((t) => t.type === 'work_date');
    expect(workDates).toHaveLength(1);
  });
});

// ─── suppression ─────────────────────────────────────────────────────────────

describe('suppression', () => {
  it('a suppressed span is not returned as a token', () => {
    const raw = 'Write tests tomorrow';
    const r = parseTask(raw, { now: NOW, suppress: [{ start: 12, end: 20 }] });
    expect(tokenTypes(r)).not.toContain('work_date');
    // but "tomorrow" should remain in the title since it's suppressed
    expect(r.title).toContain('tomorrow');
  });
});

// ─── combined ────────────────────────────────────────────────────────────────

describe('combined inputs', () => {
  it('parses date + duration together', () => {
    const r = parseTask('Write tests tomorrow for 1h', { now: NOW });
    expect(tokenTypes(r)).toContain('work_date');
    expect(tokenTypes(r)).toContain('duration');
    expect(r.title).toBe('Write tests');
    expect(tokenOf(r, 'work_date')?.value).toBe('2026-04-13');
    expect(tokenOf(r, 'duration')?.value).toBe(60);
  });

  it('parses low_thought + deadline + duration', () => {
    const r = parseTask('~ Send invoice by friday for 15m', { now: NOW });
    expect(tokenTypes(r)).toContain('low_thought');
    expect(tokenTypes(r)).toContain('deadline');
    expect(tokenTypes(r)).toContain('duration');
    expect(r.title).toBe('Send invoice');
  });
});
