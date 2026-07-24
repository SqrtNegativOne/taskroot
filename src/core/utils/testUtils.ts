import type { AppEvent, AppTask } from "../domain/models";

let nextId = 1;
export function createMockAppEvent(overrides: Partial<AppEvent> = {}): AppEvent {
    return {
        id: `mock-evt-${nextId++}`,
        title: "Mock Event",
        date: "2024-01-01",
        start: 600, // 10:00 AM
        end: 660,   // 11:00 AM
        type: "event",
        ...overrides,
    };
}

export function createMockAppTask(overrides: Partial<AppTask> = {}): AppTask {
    return {
        id: `mock-tsk-${nextId++}`,
        title: "Mock Task",
        status: "todo",
        priority: 0,
        tags: [],
        subtasks: [],
        ...overrides,
    };
}
