/**
 * Fixture data for the mock API. Designed to give every phase screen
 * something realistic to render when `npm run dev` is used outside
 * pywebview. Edit freely — none of this data is persisted anywhere.
 */
import type { CalendarEvent, Distraction, Task } from '$lib/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowISO(): string {
  return new Date().toISOString();
}

function todayAt(time: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${time}`;
}

export const FIXTURE_TASKS: Task[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'draft the release notes',
    description: null,
    work_date: todayISO(),
    deadline: null,
    tag_ids: [],
    parent_id: null,
    recur_rule: null,
    expected_duration: 45,
    is_low_thought: false,
    scheduled_start: todayAt('10:00'),
    created_at: nowISO(),
    completed_at: null
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'tidy inbox',
    description: null,
    work_date: todayISO(),
    deadline: null,
    tag_ids: [],
    parent_id: null,
    recur_rule: null,
    expected_duration: 15,
    is_low_thought: true,
    scheduled_start: null,
    created_at: nowISO(),
    completed_at: null
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'review pull request 42',
    description: 'Small refactor — should be quick.',
    work_date: todayISO(),
    deadline: null,
    tag_ids: [],
    parent_id: null,
    recur_rule: null,
    expected_duration: 30,
    is_low_thought: false,
    scheduled_start: todayAt('14:00'),
    created_at: nowISO(),
    completed_at: null
  }
];

export const FIXTURE_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-00000001-0000-0000-0000-000000000001',
    name: 'Morning standup',
    description: null,
    start: todayAt('09:00'),
    end: todayAt('09:30')
  },
  {
    id: 'ev-00000002-0000-0000-0000-000000000002',
    name: 'Sprint retro',
    description: null,
    start: todayAt('15:30'),
    end: todayAt('16:30')
  }
];

export const FIXTURE_DISTRACTIONS: Distraction[] = [
  { id: 'd1', text: 'twitter', logged_at: nowISO() },
  { id: 'd2', text: 'the news', logged_at: nowISO() }
];
