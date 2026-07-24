import { describe, it, expect } from "vitest";
import { hydrateEvents } from "./events";
import type { AppEvent } from "./events";
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
                type: "plan",
                date: "2026-05-20",
                start: 600,
                end: 660,
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
                date: "2026-05-20",
                start: 600,
                end: 660,
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
                type: "plan",
                date: "2026-05-20",
                start: 600,
                end: 660,
                taskId: "t1",
            }
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
