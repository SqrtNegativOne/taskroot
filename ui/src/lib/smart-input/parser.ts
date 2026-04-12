/**
 * Smart-input parser for TaskRoot's Capture phase.
 *
 * Scans the raw input string for structured tokens (work date, deadline,
 * duration, low-thought flag) and returns:
 *   - `tokens`  — list of matched spans with type, resolved value, and
 *                 character indices into the original string
 *   - `title`   — the remaining text after all tokens are stripped,
 *                 whitespace-collapsed and first-letter uppercased
 *
 * Patterns are applied in priority order so that compound phrases like
 * "by friday" are claimed by the `deadline` scanner before the bare
 * `work_date` scanner can grab "friday" independently.
 */

import type { ISODate } from '$lib/types';

export type TokenType = 'work_date' | 'deadline' | 'duration' | 'low_thought';

export interface Token {
  type: TokenType;
  /** Resolved value: ISODate string, number of minutes, or boolean */
  value: ISODate | number | boolean;
  /** Inclusive start index in the original raw string */
  start: number;
  /** Exclusive end index in the original raw string */
  end: number;
}

export interface ParsedTask {
  title: string;
  tokens: Token[];
}

export interface ParseOptions {
  /**
   * Reference point for relative date resolution. Defaults to `new Date()`.
   * Pass a stable value in tests so results never change.
   */
  now?: Date;
  /**
   * Spans to ignore during parsing (user-suppressed highlights).
   * Any pattern match that overlaps a suppressed span is discarded.
   */
  suppress?: Array<{ start: number; end: number }>;
}

// ─── date resolution helpers ─────────────────────────────────────────────────

function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Returns the next occurrence of `targetDow` (0=Sun … 6=Sat), always >= 1 day ahead. */
function nextWeekday(base: Date, targetDow: number): Date {
  const baseDow = base.getUTCDay();
  let delta = targetDow - baseDow;
  if (delta <= 0) delta += 7;
  return addDays(base, delta);
}

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Resolves a single date token string (alias or weekday) to an ISODate,
 * or returns null if the string is not a recognised date expression.
 */
function resolveDate(raw: string, now: Date): ISODate | null {
  const s = raw.trim().toLowerCase();

  // Simple aliases
  if (s === 'today' || s === 'tod' || s === 'eod') return toISODate(now);
  if (s === 'tomorrow' || s === 'tom' || s === 'tmrw' || s === 'tmr' || s === '2moro') {
    return toISODate(addDays(now, 1));
  }
  if (s === 'overmorrow') return toISODate(addDays(now, 2));

  // "next week" → next Monday
  if (s === 'next week' || s === 'sow') return toISODate(nextWeekday(now, 1));

  // Weekday names: "mon", "monday", …
  if (s in WEEKDAY_NAMES) return toISODate(nextWeekday(now, WEEKDAY_NAMES[s]));

  // "in N days" / "in N weeks"
  const inDays = /^in\s+(\d+)\s+days?$/.exec(s);
  if (inDays) return toISODate(addDays(now, parseInt(inDays[1], 10)));
  const inWeeks = /^in\s+(\d+)\s+weeks?$/.exec(s);
  if (inWeeks) return toISODate(addDays(now, parseInt(inWeeks[1], 10) * 7));

  return null;
}

// ─── scanner stages ───────────────────────────────────────────────────────────

/**
 * Builds a regex that matches a date alias or expression as a word-boundary
 * token. The alternation is ordered longest-first to avoid "tom" shadowing
 * "tomorrow".
 */
function buildDatePattern(): RegExp {
  const atoms = [
    'overmorrow',
    'tomorrow', 'tmrw', 'tmr', 'tom', '2moro',
    'today', 'tod', 'eod',
    'next\\s+week', 'sow',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    'in\\s+\\d+\\s+weeks?',
    'in\\s+\\d+\\s+days?',
  ];
  return new RegExp(`\\b(${atoms.join('|')})\\b`, 'gi');
}

function scanDeadlines(raw: string, now: Date): Token[] {
  const tokens: Token[] = [];
  const dateAtom = buildDatePattern().source.replace(/\\b/g, '').slice(1, -1);
  const re = new RegExp(`\\bby\\s+(${dateAtom})`, 'gi');

  for (const m of raw.matchAll(re)) {
    const resolved = resolveDate(m[1], now);
    if (resolved === null) continue;
    tokens.push({ type: 'deadline', value: resolved, start: m.index!, end: m.index! + m[0].length });
  }
  return tokens;
}

function scanWorkDates(raw: string, now: Date): Token[] {
  const tokens: Token[] = [];
  const re = buildDatePattern();

  for (const m of raw.matchAll(re)) {
    const resolved = resolveDate(m[0], now);
    if (resolved === null) continue;
    tokens.push({ type: 'work_date', value: resolved, start: m.index!, end: m.index! + m[0].length });
  }
  return tokens;
}

function scanDurations(raw: string): Token[] {
  const tokens: Token[] = [];
  const re = /\bfor\s+(?:(\d+)h)?(\d+m)?(?!\w)/gi;

  for (const m of raw.matchAll(re)) {
    const hours = m[1] ? parseInt(m[1], 10) : 0;
    const mins = m[2] ? parseInt(m[2], 10) : 0;
    if (hours === 0 && mins === 0) continue;
    tokens.push({ type: 'duration', value: hours * 60 + mins, start: m.index!, end: m.index! + m[0].length });
  }
  return tokens;
}

function scanLowThought(raw: string): Token[] {
  const m = /^~\s*/.exec(raw);
  if (!m) return [];
  return [{ type: 'low_thought', value: true, start: m.index, end: m.index + m[0].length }];
}

// ─── overlap resolution ───────────────────────────────────────────────────────

function overlaps(a: Token, b: Token): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Given a flat list of candidate tokens (possibly overlapping), returns a
 * deduplicated, non-overlapping list. Earlier-start wins; ties broken by
 * the order of the input array (which reflects scanner priority).
 */
function removeOverlaps(candidates: Token[]): Token[] {
  const sorted = [...candidates].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: Token[] = [];
  for (const tok of sorted) {
    if (result.some((kept) => overlaps(kept, tok))) continue;
    result.push(tok);
  }
  return result;
}

// ─── public API ───────────────────────────────────────────────────────────────

export function parseTask(raw: string, options: ParseOptions = {}): ParsedTask {
  const now = options.now ?? new Date();
  const suppressed = options.suppress ?? [];

  function isSuppressed(tok: Token): boolean {
    return suppressed.some((s) => tok.start < s.end && s.start < tok.end);
  }

  // Run scanners in priority order: deadline before work_date so "by friday"
  // doesn't produce two tokens.
  const candidates: Token[] = [
    ...scanLowThought(raw),
    ...scanDeadlines(raw, now),
    ...scanDurations(raw),
    ...scanWorkDates(raw, now),
  ].filter((t) => !isSuppressed(t));

  const tokens = removeOverlaps(candidates);

  // Build clean title: remove matched spans, collapse spaces, capitalise.
  const spans = [...tokens].sort((a, b) => a.start - b.start);
  let title = '';
  let cursor = 0;
  for (const tok of spans) {
    title += raw.slice(cursor, tok.start);
    cursor = tok.end;
  }
  title += raw.slice(cursor);
  title = title.replace(/\s{2,}/g, ' ').trim();
  if (title.length > 0) title = title[0].toUpperCase() + title.slice(1);

  return { title, tokens };
}
