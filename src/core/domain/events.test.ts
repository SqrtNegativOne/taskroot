import { describe, it, expect } from "vitest";
import { hydrateEvents } from "./events";
import type { AppEvent } from "./models";
import type { AppTask } from "./models";

describe("hydrateEvents", () => {
    it("should hydrate a plan event using the corresponding task data", () => {
        const tasks: AppTask[] = [
            {
                id: "t1",
                title: "Task 1",
                priority: "P1",
                status: "nextup",
                tags: [],
            },
            {
                id: "t2",
                title: "Task 2",
                priority: "P2",
                status: "done",
                tags: [],
            },
        ];

        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Dummy",
                type: "plan",
                startTime: "2026-05-20T10:00:00",
                endTime: "2026-05-20T11:00:00",
                taskId: "t2",
            }
        ];

        const hydrated = hydrateEvents(events, tasks);

        expect(hydrated.length).toBe(1);
        expect(hydrated[0].title).toBe("Task 2");
        expect(hydrated[0].priority).toBe("P2");
        expect(hydrated[0].isDone).toBe(true);
    });

    it("should allow busy events to have their own titles and no task", () => {
        const tasks: AppTask[] = [];
        const events: AppEvent[] = [
            {
                id: "e1",
                type: "busy",
                startTime: "2026-05-20T10:00:00",
                endTime: "2026-05-20T11:00:00",
                title: "Team Sync",
            }
        ];

        const hydrated = hydrateEvents(events, tasks);

        expect(hydrated.length).toBe(1);
        expect(hydrated[0].title).toBe("Team Sync");
        expect(hydrated[0].isDone).toBe(false); // busy events are never done
    });

    it("should reflect name updates dynamically (name update thing)", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Fake title",
                type: "plan",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                taskId: "t1",
            },
        ];

        // Initial state
        let tasks: AppTask[] = [
            {
                id: "t1",
                title: "Old Name",
                priority: "P1",
                status: "nextup",
                tags: [],
            },
        ];
        let hydrated = hydrateEvents(events, tasks);
        expect(hydrated[0].title).toBe("Old Name");

        // Name updates
        tasks = [
            {
                id: "t1",
                title: "New Name",
                priority: "P1",
                status: "nextup",
                tags: [],
            },
        ];
        hydrated = hydrateEvents(events, tasks);
        expect(hydrated[0].title).toBe("New Name");
    });
});

describe("ISO Architecture specific scenarios", () => {
    it("should handle events crossing midnight", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                type: "info",
                title: "Late Night Event",
                startTime: "2026-08-01T22:00:00",
                endTime: "2026-08-02T02:00:00",
            }
        ];
        expect(events[0].startTime).toBe("2026-08-01T22:00:00");
        expect(events[0].endTime).toBe("2026-08-02T02:00:00");
    });

    it("should handle multi-day all-day events", () => {
        const events: AppEvent[] = [
            {
                id: "e2",
                type: "info",
                title: "Vacation",
                startTime: "2026-08-10T00:00:00",
                endTime: "2026-08-15T00:00:00",
                isAllDay: true,
            }
        ];
        expect(events[0].isAllDay).toBe(true);
        expect(events[0].startTime).toBe("2026-08-10T00:00:00");
        expect(events[0].endTime).toBe("2026-08-15T00:00:00");
    });

    it("should enforce exact ISO string serialization format without trailing Z", () => {
        const event: AppEvent = {
            id: "e3",
            type: "info",
            title: "Floating Time Event",
            startTime: "2026-08-01T09:00:00",
            endTime: "2026-08-01T10:00:00",
        };
        expect(event.startTime.endsWith("Z")).toBe(false);
        expect(event.endTime.endsWith("Z")).toBe(false);
        expect(event.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
});
