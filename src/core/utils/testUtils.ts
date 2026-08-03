import type { AppEvent, AppTask } from "../domain/models";

let nextId = 1;
export function createMockAppEvent(overrides: Partial<AppEvent> = {}): AppEvent {
    return {
        id: `mock-evt-${nextId++}`,
        title: "Mock Event",
        startTime: "2024-01-01T10:00:00",
        endTime: "2024-01-01T11:00:00",
        type: "busy",
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
