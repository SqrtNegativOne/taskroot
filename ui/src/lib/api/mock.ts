/**
 * In-memory mock of the TaskRoot API for standalone UI development.
 *
 * Used automatically when `npm run dev` runs the app outside pywebview.
 * State lives in closed-over variables and resets on page refresh —
 * this is intentional. The goal is a fast feedback loop on visuals
 * and interactions, not a working local backend.
 *
 * If you're adding a new method to `TaskRootApi`, add a corresponding
 * mock implementation here so the dev server keeps working.
 */
import type {
  BootstrapPayload,
  TaskRootApi
} from './index';
import type { Distraction, Suggestion, Task, TimeSession } from '$lib/types';
import { FIXTURE_DISTRACTIONS, FIXTURE_TASKS } from './fixtures';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowISO(): string {
  return new Date().toISOString();
}

const BASE_VERBS = new Set([
  'add', 'ask', 'call', 'check', 'clean', 'clear', 'close', 'code',
  'complete', 'create', 'debug', 'delete', 'design', 'draft', 'edit',
  'email', 'fix', 'follow', 'get', 'give', 'help', 'learn', 'list',
  'make', 'meet', 'move', 'plan', 'prepare', 'read', 'refactor',
  'remove', 'rename', 'research', 'review', 'run', 'save', 'schedule',
  'send', 'set', 'ship', 'sort', 'start', 'stop', 'study', 'submit',
  'sync', 'take', 'test', 'tidy', 'track', 'update', 'write'
]);

export function createMockApi(): TaskRootApi {
  const tasks = new Map<string, Task>();
  for (const t of FIXTURE_TASKS) tasks.set(t.id, { ...t });
  const distractions: Distraction[] = [...FIXTURE_DISTRACTIONS];
  let active: TimeSession | null = null;

  return {
    async bootstrap(): Promise<BootstrapPayload> {
      return { day: todayISO(), active_session: active };
    },

    async captureTask(input) {
      const firstWord = (input.name ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
      if (!BASE_VERBS.has(firstWord)) {
        throw new Error(
          `Task name must begin with a verb. '${firstWord}' is not recognised.`
        );
      }
      const task: Task = {
        id: uuid(),
        name: input.name,
        description: input.description ?? null,
        work_date: input.work_date ?? null,
        deadline: input.deadline ?? null,
        tag_ids: input.tag_ids ?? [],
        parent_id: input.parent_id ?? null,
        recur_rule: input.recur_rule ?? null,
        expected_duration: input.expected_duration ?? null,
        is_low_thought: input.is_low_thought ?? null,
        created_at: nowISO(),
        completed_at: null
      };
      tasks.set(task.id, task);
      return task;
    },

    async similarTasks(query): Promise<Suggestion[]> {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return [...tasks.values()]
        .filter((t) => t.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((task) => ({ task, score: 80 }));
    },

    async listTodayTasks(): Promise<Task[]> {
      const today = todayISO();
      return [...tasks.values()].filter((t) => t.work_date === today);
    },

    async listOverdue(): Promise<Task[]> {
      const today = todayISO();
      return [...tasks.values()].filter(
        (t) => t.work_date !== null && t.work_date < today && !t.completed_at
      );
    },

    async startTimer(taskId): Promise<TimeSession> {
      if (active && active.task_id !== taskId) {
        active = { ...active, ended_at: nowISO() };
      }
      active = {
        id: uuid(),
        task_id: taskId,
        started_at: nowISO(),
        ended_at: null
      };
      return active;
    },

    async stopTimer(): Promise<TimeSession | null> {
      if (!active) return null;
      const stopped: TimeSession = { ...active, ended_at: nowISO() };
      active = null;
      return stopped;
    },

    async activeTimer(): Promise<TimeSession | null> {
      return active;
    },

    async logDistraction(text): Promise<Distraction> {
      const d: Distraction = { id: uuid(), text, logged_at: nowISO() };
      distractions.unshift(d);
      return d;
    }
  };
}
