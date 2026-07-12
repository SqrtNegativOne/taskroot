import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';

// Sample data + helpers for Taskroot.
// Today is locked to 2026-05-20 (Wed) so the prototype feels populated.

const TODAY = new Date();

const SAMPLE_TASKS = [];

// Events already on the calendar. Time is minutes from midnight.
// type: 'plan' (planned task block) | 'meeting' (pre-existing) | 'block' (focus block)
const SAMPLE_EVENTS = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAD2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${PAD2(d.getMonth() + 1)}-${PAD2(d.getDate())}`;
const parseYMD = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d) => {
  // Monday-first
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - day);
  return x;
};
const minutesToHHMM = (m) => `${PAD2(Math.floor(m / 60))}:${PAD2(m % 60)}`;
const hhmmShort = (m) => {
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = ((h + 11) % 12) + 1;
  const ap = h < 12 ? 'a' : 'p';
  return mm === 0 ? `${h12}${ap}` : `${h12}:${PAD2(mm)}${ap}`;
};
const durationLabel = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
};
const dueLabel = (dueStr, today) => {
  if (!dueStr) return '';
  const d = parseYMD(dueStr);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff < 0) return `${-diff}d ago`;
  if (diff < 7) return `${diff}d`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_TINY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── More seed data for Do / Rest screens ────────────────────────────────────

const DEFAULT_STATUSES = [
  { id: 'unresolved', label: 'Unresolved', color: 'var(--tag-red)' },
  { id: 'resolving',  label: 'Resolving',  color: 'var(--tag-yellow)' },
  { id: 'resolved',   label: 'Resolved',   color: 'var(--tag-green)' },
];

const DEFAULT_DISTRACTION_COLUMNS = [
  { id: 'name',    label: 'Name',    width: 360, type: 'text' },
  { id: 'status',  label: 'Status',  width: 160, type: 'status' },
  { id: 'created', label: 'Created', width: 160, type: 'datetime' },
];

const SAMPLE_TIPS = [
  'If a thought pops into your head, write it down immediately.',
  'When you feel stuck, the timer keeps running. Don\'t pause to think.',
  'Two minutes of fake-it-til-you-make-it usually breaks the wall.',
];

const REST_CHECKLIST_DEFAULTS = [
  { id: 'r1', title: 'Get out of your chair.', type: 'check' },
  { id: 'r2', title: 'Drink water.', type: 'check' },
  { id: 'r3', title: 'Go to the washroom.', type: 'check' },
  { id: 'r4', title: 'Check your notes for tasks you could not input.', type: 'check' },
  { id: 'r5', title: 'Brain dump.', type: 'check' },
  { id: 'r6', title: 'Maybe write in your journal.', type: 'check' },
];

export { TODAY, SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_TIPS, REST_CHECKLIST_DEFAULTS, ymd, parseYMD, sameDay, addDays, startOfMonth, startOfWeek, minutesToHHMM, hhmmShort, durationLabel, dueLabel, MONTHS, MONTHS_LONG, DOW_SHORT, DOW_TINY, PAD2 };
