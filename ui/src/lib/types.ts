/**
 * Entity types mirroring the Python Pydantic models in
 * `src/taskroot/models.py`. These are the shapes that cross the
 * pywebview bridge as plain JSON.
 *
 * Each entity is marked with an index signature `[key: string]: unknown`
 * so unknown fields (present on rows saved by a newer version of the
 * backend) round-trip through the UI without type errors.
 *
 * **Phase components should import only from this file and from the
 * API interface — never from `$lib/api/bridge` or `$lib/api/mock`.**
 */

export type UUID = string;
export type ISODate = string; // "2026-04-11"
export type ISODateTime = string; // "2026-04-11T10:30:00"

export type RecurType = 'daily' | 'weekly' | 'monthly';

export interface RecurRule {
  type: RecurType;
  interval: number;
  days_of_week: number[]; // 0 = Monday .. 6 = Sunday
  day_of_month: number | null;
}

export interface Task {
  id: UUID;
  name: string;
  description: string | null;
  work_date: ISODate | null;
  deadline: ISODate | null;
  tag_ids: UUID[];
  parent_id: UUID | null;
  recur_rule: RecurRule | null;
  expected_duration: number | null; // minutes
  is_low_thought: boolean | null;
  scheduled_start: ISODateTime | null;
  created_at: ISODateTime;
  completed_at: ISODateTime | null;
  [key: string]: unknown;
}

export interface CalendarEvent {
  id: UUID;
  name: string;
  description: string | null;
  start: ISODateTime;
  end: ISODateTime | null;
  [key: string]: unknown;
}

export interface TimeSession {
  id: UUID;
  task_id: UUID;
  started_at: ISODateTime;
  ended_at: ISODateTime | null;
  [key: string]: unknown;
}

export interface Distraction {
  id: UUID;
  text: string;
  logged_at: ISODateTime;
  [key: string]: unknown;
}

export interface Tag {
  id: UUID;
  name: string;
  [key: string]: unknown;
}

export interface Suggestion {
  task: Task;
  score: number;
}

export type Phase =
  | 'capture'
  | 'clarify'
  | 'plan'
  | 'do'
  | 'reorient'
  | 'shutdown';
