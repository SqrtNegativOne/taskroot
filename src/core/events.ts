export type BaseEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  start: number; // minutes from midnight
  end: number;
};

// TaskEvent uses a task, does not have a title of its own.
export type TaskEvent = BaseEvent & {
  type: 'plan';
  taskId: string;
};

// StandaloneEvent has its own title, does not use a task.
export type StandaloneEvent = BaseEvent & {
  type: 'meeting';
  title: string;
};

export type AppEvent = TaskEvent | StandaloneEvent;

// The populated output type for the UI
export type HydratedEvent = BaseEvent & {
  type: 'plan' | 'meeting';
  taskId?: string; // only if it's a plan
  title: string;
  priority?: string | null;
  isDone: boolean;
  task?: any; // The raw task object if needed by the UI
};

/**
 * Hydrates events with data from their respective tasks to ensure consistency.
 */
export function hydrateEvents(events: AppEvent[], tasks: any[]): HydratedEvent[] {
  return events.map((ev) => {
    if (ev.type === 'plan') {
      const task = tasks.find(t => t.id === ev.taskId);
      return {
        ...ev,
        title: task ? task.title : 'Unknown Task',
        priority: task ? task.priority : null,
        isDone: task ? task.status === 'done' : false,
        task
      };
    } else {
      // Meetings and other non-task events
      return {
        ...ev,
        title: ev.title || 'Untitled',
        isDone: false,
      };
    }
  });
}
