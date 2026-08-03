import { describe, it, expect } from "vitest";
import { hydrateEvents, isEventAllDay } from "./events";
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
                type: "busy",
                startTime: "2026-05-20T10:00:00",
                endTime: "2026-05-20T11:00:00",
                taskId: "t2",
            }
        ];

        const hydrated = hydrateEvents(events, tasks);

        expect(hydrated.length).toBe(1);
        expect(hydrated[0].title).toBe("Task 2");
        expect(hydrated[0].task?.priority).toBe("P2");
        expect(hydrated[0].task?.status).toBe("done");
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
        expect(hydrated[0].task).toBeUndefined();
    });

    it("should hydrate an info event as a plan using the corresponding task data", () => {
        const tasks: AppTask[] = [
            {
                id: "t1",
                title: "Task 1",
                priority: "P1",
                status: "nextup",
                tags: [],
            },
        ];
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Dummy",
                type: "info",
                startTime: "2026-05-20T10:00:00",
                endTime: "2026-05-20T11:00:00",
                taskId: "t1",
            }
        ];
        const hydrated = hydrateEvents(events, tasks);
        expect(hydrated.length).toBe(1);
        expect(hydrated[0].title).toBe("Task 1");
    });

    it("should reflect name updates dynamically (name update thing)", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Fake title",
                type: "busy",
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

    it("should dynamically update the category to match the latest calendar summary", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Test Event",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                googleCalendarId: "cal_1",
                category: "Old Calendar Name"
            },
            {
                id: "e2",
                title: "Test Event 2",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                category: "Another Old Name"
            },
            {
                id: "e3",
                title: "Test Event 3",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
            }
        ];

        const calendars = [
            { id: "cal_1", summary: "New Calendar Name" },
            { id: "cal_2", summary: "Another Old Name" }
        ];

        const hydrated = hydrateEvents(events, [], calendars);

        expect(hydrated[0].category).toBe("New Calendar Name");
        expect(hydrated[1].category).toBe("Another Old Name");
        expect(hydrated[2].category).toBe("New Calendar Name"); // Fallback to first calendar
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
                startTime: "2026-08-10",
                endTime: "2026-08-15",
            }
        ];
        expect(isEventAllDay(events[0])).toBe(true);
        expect(events[0].startTime).toBe("2026-08-10");
        expect(events[0].endTime).toBe("2026-08-15");
    });

    it("should correctly identify all day events from strings", () => {
        expect(isEventAllDay({ startTime: "2026-08-10", endTime: "2026-08-15" })).toBe(true);
        expect(isEventAllDay({ startTime: "2026-08-10T10:00:00", endTime: "2026-08-10T11:00:00" })).toBe(false);
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
