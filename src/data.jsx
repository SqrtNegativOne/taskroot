// Sample data + helpers for Taskroot.
// Today is locked to 2026-05-20 (Wed) so the prototype feels populated.

const TODAY = new Date(2026, 4, 20); // May 20, 2026

const SAMPLE_TASKS = [
  {
    id: 't1', title: 'Write Q2 retrospective',
    priority: 'P1', tags: ['writing', 'quarterly'],
    est: 90, due: '2026-05-22', status: 'todo',
    notes: 'Cover shipped items, missed targets, and 3 lessons. Share to #team-leads by EOW.',
    subtasks: [
      { id: 's1', title: 'Pull metrics from dashboard', done: true },
      { id: 's2', title: 'Draft outline', done: false },
      { id: 's3', title: 'Get feedback from Jamie', done: false },
    ],
  },
  {
    id: 't2', title: 'Review pull request #482',
    priority: 'P0', tags: ['code-review', 'auth'],
    est: 30, due: '2026-05-20', status: 'doing',
    notes: 'Auth refactor — touches session handling. Owner needs this in today.',
    subtasks: [],
  },
  {
    id: 't3', title: 'Prep onboarding doc for new hire',
    priority: 'P2', tags: ['writing', 'people'],
    est: 60, due: '2026-05-25', status: 'next-up',
    notes: '',
    subtasks: [
      { id: 's4', title: 'Day 1 checklist', done: false },
      { id: 's5', title: 'Slack channel list', done: false },
    ],
  },
  {
    id: 't4', title: 'Cancel old SaaS subscription',
    priority: 'P3', tags: ['admin'],
    est: 10, due: '2026-05-30', status: 'todo',
    notes: 'Renews June 3. Login is in 1pass.',
    subtasks: [],
  },
  {
    id: 't5', title: 'Sketch billing flow wireframes',
    priority: 'P1', tags: ['design', 'billing'],
    est: 120, due: '2026-05-21', status: 'next-up',
    notes: 'Three states: trial, active, past-due. Use the existing component kit.',
    subtasks: [
      { id: 's6', title: 'Trial state', done: false },
      { id: 's7', title: 'Active state', done: false },
      { id: 's8', title: 'Past-due state', done: false },
    ],
  },
  {
    id: 't6', title: 'Reply to Maya re: contract',
    priority: 'P1', tags: ['email', 'legal'],
    est: 15, due: '2026-05-20', status: 'todo',
    notes: '',
    subtasks: [],
  },
  {
    id: 't7', title: 'Refactor settings module',
    priority: 'P2', tags: ['code', 'tech-debt'],
    est: 180, due: '2026-06-05', status: 'todo',
    notes: 'Break the 1.2k-line component into 4 smaller ones. Keep tests passing.',
    subtasks: [],
  },
  {
    id: 't8', title: 'Schedule dentist',
    priority: 'P3', tags: ['personal'],
    est: 10, due: '2026-05-28', status: 'todo',
    notes: '',
    subtasks: [],
  },
  {
    id: 't9', title: 'Read "Designing Data-Intensive Apps" ch.7',
    priority: 'P2', tags: ['reading', 'learning'],
    est: 60, due: '2026-05-24', status: 'todo',
    notes: 'Transactions chapter. Take notes on isolation levels.',
    subtasks: [],
  },
  {
    id: 't10', title: 'Plan team offsite agenda',
    priority: 'P1', tags: ['people', 'planning'],
    est: 75, due: '2026-05-27', status: 'todo',
    notes: '',
    subtasks: [
      { id: 's9', title: 'Draft 2-day schedule', done: false },
      { id: 's10', title: 'Book dinner reservation', done: true },
    ],
  },
  {
    id: 't11', title: 'Fix flaky integration test',
    priority: 'P2', tags: ['code', 'tests'],
    est: 45, due: '2026-05-21', status: 'doing',
    notes: 'Race condition in payment_test.py — fails ~1 in 20.',
    subtasks: [],
  },
  {
    id: 't12', title: 'Update LinkedIn profile',
    priority: 'P3', tags: ['personal', 'career'],
    est: 30, due: '2026-06-10', status: 'todo',
    notes: '',
    subtasks: [],
  },
  {
    id: 't13', title: 'Audit production error logs',
    priority: 'P1', tags: ['code', 'ops'],
    est: 60, due: '2026-05-21', status: 'next-up',
    notes: 'Sentry has been noisy this week. Group by error type, prioritize top 5.',
    subtasks: [],
  },
  {
    id: 't14', title: 'Buy groceries',
    priority: 'P3', tags: ['personal', 'errands'],
    est: 45, due: '2026-05-20', status: 'todo',
    notes: '',
    subtasks: [],
  },
  {
    id: 't15', title: 'Finalize hiring loop for designer role',
    priority: 'P0', tags: ['people', 'hiring'],
    est: 45, due: '2026-05-20', status: 'doing',
    notes: 'Confirm panelists, send candidate prep doc, block calendars.',
    subtasks: [
      { id: 's11', title: 'Confirm interviewers', done: true },
      { id: 's12', title: 'Send prep doc', done: false },
    ],
  },
];

// Events already on the calendar. Time is minutes from midnight.
// type: 'plan' (planned task block) | 'meeting' (pre-existing) | 'block' (focus block)
const SAMPLE_EVENTS = [
  // Today
  { id: 'e1', taskId: null, date: '2026-05-20', start: 9 * 60, end: 9 * 60 + 30, type: 'meeting', title: 'Standup' },
  { id: 'e2', taskId: 't2', date: '2026-05-20', start: 10 * 60, end: 10 * 60 + 30, type: 'plan' },
  { id: 'e3', taskId: null, date: '2026-05-20', start: 12 * 60, end: 13 * 60, type: 'meeting', title: 'Lunch w/ Priya' },
  { id: 'e4', taskId: 't15', date: '2026-05-20', start: 14 * 60, end: 14 * 60 + 45, type: 'plan' },
  { id: 'e5', taskId: null, date: '2026-05-20', start: 16 * 60, end: 17 * 60, type: 'meeting', title: '1:1 / Alex' },

  // Week ahead
  { id: 'e6', taskId: 't5', date: '2026-05-21', start: 10 * 60, end: 12 * 60, type: 'plan' },
  { id: 'e7', taskId: null, date: '2026-05-21', start: 14 * 60, end: 15 * 60, type: 'meeting', title: 'Design review' },
  { id: 'e8', taskId: 't1', date: '2026-05-22', start: 9 * 60, end: 10 * 60 + 30, type: 'plan' },
  { id: 'e9', taskId: null, date: '2026-05-22', start: 13 * 60, end: 14 * 60, type: 'meeting', title: 'Eng all-hands' },
  { id: 'e10', taskId: 't10', date: '2026-05-25', start: 11 * 60, end: 12 * 60 + 15, type: 'plan' },
  { id: 'e11', taskId: null, date: '2026-05-26', start: 15 * 60, end: 16 * 60, type: 'meeting', title: 'Skip-level' },
  { id: 'e12', taskId: null, date: '2026-05-27', start: 10 * 60, end: 11 * 60, type: 'meeting', title: 'Hiring sync' },

  // Earlier in month — historical
  { id: 'e13', taskId: null, date: '2026-05-13', start: 14 * 60, end: 15 * 60, type: 'meeting', title: 'Quarterly review' },
  { id: 'e14', taskId: null, date: '2026-05-15', start: 9 * 60, end: 10 * 60, type: 'meeting', title: 'Offsite prep' },
  { id: 'e15', taskId: null, date: '2026-05-18', start: 11 * 60, end: 12 * 60, type: 'meeting', title: 'Roadmap sync' },
];

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
  const diff = Math.round((d - today) / 86400000);
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
  { id: 'unresolved', label: 'Unresolved', color: '#d97757' },
  { id: 'resolving',  label: 'Resolving',  color: '#e9b96e' },
  { id: 'resolved',   label: 'Resolved',   color: '#8caa9a' },
];

const DEFAULT_DISTRACTION_COLUMNS = [
  { id: 'name',    label: 'Name',    width: 360, type: 'text' },
  { id: 'status',  label: 'Status',  width: 160, type: 'status' },
  { id: 'created', label: 'Created', width: 160, type: 'datetime' },
];

const SAMPLE_DISTRACTIONS = [
  { id: 'd1', name: 'Slack DM from Priya — answered later', status: 'resolved',   created: '2026-05-20T09:12' },
  { id: 'd2', name: 'Thought about lunch order',            status: 'resolved',   created: '2026-05-20T10:04' },
  { id: 'd3', name: 'Email about offsite logistics',        status: 'resolving',  created: '2026-05-20T10:21' },
  { id: 'd4', name: 'Phone buzzed — checked it',            status: 'unresolved', created: '2026-05-20T10:38' },
];

const SAMPLE_TIPS = [
  'If a thought pops into your head, write it down — don\'t hold it.',
  'When you feel stuck, the timer keeps running. Don\'t pause to think.',
  'Two minutes of fake-it-til-you-make-it usually breaks the wall.',
  'Resolve distractions in batches at the next break, not now.',
];

const SAMPLE_NOTES = [
  { id: 'n1', title: 'Today — focus journal',          vault: 'work',    path: 'Daily/2026-05-20.md' },
  { id: 'n2', title: 'Q2 retro — raw notes',           vault: 'work',    path: 'Quarterly/Q2-retro.md' },
  { id: 'n3', title: 'Billing flow — sketch dump',     vault: 'design',  path: 'Wireframes/billing.md' },
  { id: 'n4', title: 'On deep work — book highlights', vault: 'reading', path: 'Books/deep-work.md' },
];

const REST_CHECKLIST_DEFAULTS = [
  { id: 'r1', title: 'Get out of your chair.', type: 'check' },
  { id: 'r2', title: 'Drink water.', type: 'check' },
  { id: 'r3', title: 'Go to the washroom.', type: 'check' },
  { id: 'r4', title: 'Check your notes for tasks you could not input.', type: 'check' },
  { id: 'r5', title: 'Brain dump.', type: 'check' },
  { id: 'r6', title: 'Maybe write in your journal.', type: 'check' },
];

Object.assign(window, {
  TODAY, SAMPLE_TASKS, SAMPLE_EVENTS,
  DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS,
  SAMPLE_TIPS, SAMPLE_NOTES, REST_CHECKLIST_DEFAULTS,
  ymd, parseYMD, sameDay, addDays, startOfMonth, startOfWeek,
  minutesToHHMM, hhmmShort, durationLabel, dueLabel,
  MONTHS, MONTHS_LONG, DOW_SHORT, DOW_TINY, PAD2,
});
