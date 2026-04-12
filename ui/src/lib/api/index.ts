/**
 * The API contract between the UI and the TaskRoot backend.
 *
 * Every phase screen that needs backend data goes through this
 * interface — not `bridge.ts` and not `mock.ts` directly. This lets
 * us swap the implementation without touching UI code, and it's
 * also the single file to read if you want to know what the UI can
 * actually ask the backend for.
 *
 * Implementations:
 *   - `bridge.ts` — real, calls `window.pywebview.api.*`
 *   - `mock.ts`   — fixture-backed, used when running `npm run dev`
 *                   outside pywebview so the UI can be built in
 *                   isolation.
 *
 * `getApi()` picks the right implementation at runtime by looking
 * for `window.pywebview`.
 */
import type {
  CalendarEvent,
  Distraction,
  Suggestion,
  Task,
  TimeSession
} from '$lib/types';

export interface BootstrapPayload {
  day: string;
  active_session: TimeSession | null;
}

export interface TaskRootApi {
  bootstrap(): Promise<BootstrapPayload>;

  // Capture phase
  captureTask(task: Partial<Task> & { name: string }): Promise<Task>;
  similarTasks(query: string): Promise<Suggestion[]>;

  // Queries
  listTodayTasks(): Promise<Task[]>;
  listOverdue(): Promise<Task[]>;

  // Time tracking
  startTimer(taskId: string): Promise<TimeSession>;
  stopTimer(): Promise<TimeSession | null>;
  activeTimer(): Promise<TimeSession | null>;

  // Distractions
  logDistraction(text: string): Promise<Distraction>;

  // Widget / calendar events
  listDayEvents(): Promise<CalendarEvent[]>;
  createEvent(event: Partial<CalendarEvent> & { name: string; start: string }): Promise<CalendarEvent>;
  updateEvent(event: Partial<CalendarEvent> & { id: string }): Promise<CalendarEvent>;
  deleteEvent(eventId: string): Promise<void>;
  scheduleTask(taskId: string, start: string, end: string): Promise<Task>;
}

let _api: TaskRootApi | null = null;
let _pending: Promise<TaskRootApi> | null = null;

export function getApi(): Promise<TaskRootApi> {
  if (_api) return Promise.resolve(_api);
  if (_pending) return _pending;
  _pending = (async () => {
    if (typeof window !== 'undefined' && window.pywebview?.api) {
      const { createBridgeApi } = await import('./bridge');
      _api = await createBridgeApi();
    } else {
      const { createMockApi } = await import('./mock');
      _api = createMockApi();
    }
    return _api;
  })();
  return _pending;
}
