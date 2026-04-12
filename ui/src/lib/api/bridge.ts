/**
 * Real backend: bridges to `window.pywebview.api`.
 *
 * The Python side (`src/taskroot/api.py::Api`) returns envelopes of
 * the form `{ok: true, data: ...}` or `{error: "..."}`. We unwrap
 * those here so the rest of the UI sees plain values and catches
 * errors via normal try/catch.
 *
 * pywebview may call this before the bridge object is fully injected
 * into the window — we wait for `pywebviewready` once on load.
 */
import type {
  BootstrapPayload,
  TaskRootApi
} from './index';
import type {
  CalendarEvent,
  Distraction,
  Suggestion,
  Task,
  TimeSession
} from '$lib/types';

interface Envelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

interface PyWebViewApi {
  bootstrap(): Promise<Envelope<BootstrapPayload>>;
  capture_task(payload: unknown): Promise<Envelope<Task>>;
  similar_tasks(query: string): Promise<Envelope<Suggestion[]>>;
  list_today_tasks(): Promise<Envelope<Task[]>>;
  list_overdue(): Promise<Envelope<Task[]>>;
  start_timer(task_id: string): Promise<Envelope<TimeSession>>;
  stop_timer(): Promise<Envelope<TimeSession | null>>;
  active_timer(): Promise<Envelope<TimeSession | null>>;
  log_distraction(text: string): Promise<Envelope<Distraction>>;
  list_day_events(): Promise<Envelope<CalendarEvent[]>>;
  create_event(payload: unknown): Promise<Envelope<CalendarEvent>>;
  update_event(payload: unknown): Promise<Envelope<CalendarEvent>>;
  delete_event(event_id: string): Promise<Envelope<null>>;
  schedule_task(task_id: string, start: string, end: string): Promise<Envelope<Task>>;
}

function unwrap<T>(response: Envelope<T>): T {
  if (response && typeof response === 'object' && 'error' in response && response.error) {
    throw new Error(response.error);
  }
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as unknown as T;
}

function waitForBridge(): Promise<PyWebViewApi> {
  return new Promise((resolve) => {
    if (window.pywebview?.api) {
      resolve(window.pywebview.api as unknown as PyWebViewApi);
      return;
    }
    window.addEventListener(
      'pywebviewready',
      () => resolve(window.pywebview!.api as unknown as PyWebViewApi),
      { once: true }
    );
  });
}

export async function createBridgeApi(): Promise<TaskRootApi> {
  const py = await waitForBridge();
  return {
    bootstrap: async () => unwrap(await py.bootstrap()),
    captureTask: async (task) => unwrap(await py.capture_task(task)),
    similarTasks: async (query) => unwrap(await py.similar_tasks(query)),
    listTodayTasks: async () => unwrap(await py.list_today_tasks()),
    listOverdue: async () => unwrap(await py.list_overdue()),
    startTimer: async (taskId) => unwrap(await py.start_timer(taskId)),
    stopTimer: async () => unwrap(await py.stop_timer()),
    activeTimer: async () => unwrap(await py.active_timer()),
    logDistraction: async (text) => unwrap(await py.log_distraction(text)),
    listDayEvents: async () => unwrap(await py.list_day_events()),
    createEvent: async (event) => unwrap(await py.create_event(event)),
    updateEvent: async (event) => unwrap(await py.update_event(event)),
    deleteEvent: async (eventId) => { unwrap(await py.delete_event(eventId)); },
    scheduleTask: async (taskId, start, end) => unwrap(await py.schedule_task(taskId, start, end))
  };
}
