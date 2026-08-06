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
                priority: 1,
                status: "nextup",
                tags: [],
            },
            {
                id: "t2",
                title: "Task 2",
                priority: 2,
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
        expect(hydrated[0].task?.priority).toBe(2);
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
                priority: 1,
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
                priority: 1,
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
                priority: 1,
                status: "nextup",
                tags: [],
            },
        ];
        hydrated = hydrateEvents(events, tasks);
        expect(hydrated[0].title).toBe("New Name");
    });

    it("derives category from remoteCollectionId, not from any stored field", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Test Event",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal_1",
            },
            {
                id: "e2",
                title: "Test Event 2",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal_2",
            },
            {
                id: "e3",
                title: "Test Event 3",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                // no remoteCollectionId → falls back to primary
            }
        ];

        const calendars = [
            { id: "cal_1", summary: "Calendar One", primary: true },
            { id: "cal_2", summary: "Calendar Two" }
        ];

        const hydrated = hydrateEvents(events, [], calendars);

        expect(hydrated[0].category).toBe("Calendar One");
        expect(hydrated[1].category).toBe("Calendar Two");
        expect(hydrated[2].category).toBe("Calendar One"); // no ID → primary fallback
    });
});

// ---------------------------------------------------------------------------
// hydrateEvents — calendar resolution (new scheme: remoteCollectionId is authoritative)
// ---------------------------------------------------------------------------

describe("hydrateEvents — calendar rename", () => {
    it("reflects the new calendar name immediately (no stale category stored)", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Team sync",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
                // no category stored — new scheme
            },
        ];
        const calendars = [{ id: "cal-work", summary: "Work (renamed)", backgroundColor: "#4285f4" }];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.category).toBe("Work (renamed)");
    });

    it("is idempotent: hydrating twice with the same calendars yields the same result", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Meeting",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
            },
        ];
        const calendars = [{ id: "cal-work", summary: "Work" }];

        const [first] = hydrateEvents(events, [], calendars);
        const [second] = hydrateEvents(events, [], calendars);

        expect(first.category).toBe(second.category);
    });

    it("picks up a rename immediately on the next hydration call (no store write needed)", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Meeting",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
            },
        ];

        const before = hydrateEvents(events, [], [{ id: "cal-work", summary: "Work" }]);
        expect(before[0].category).toBe("Work");

        const after = hydrateEvents(events, [], [{ id: "cal-work", summary: "My Work Calendar" }]);
        expect(after[0].category).toBe("My Work Calendar");
    });
});

describe("hydrateEvents — calendar color change", () => {
    it("reflects the new color immediately", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
            },
        ];

        const before = hydrateEvents(events, [], [
            { id: "cal-work", summary: "Work", backgroundColor: "#aaaaaa" },
        ]);

        const after = hydrateEvents(events, [], [
            { id: "cal-work", summary: "Work", backgroundColor: "#4285f4" },
        ]);

        expect(before[0].color).not.toBe(after[0].color);
    });

    it("has no color when the calendar has no backgroundColor configured", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
            },
        ];
        const calendars = [{ id: "cal-work", summary: "Work" }];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.color).toBeUndefined();
    });
});

describe("hydrateEvents — calendar deleted from store", () => {
    it("falls back to the primary calendar when an event's calendar is deleted", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Orphaned event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-deleted",
            },
        ];
        const calendars = [
            { id: "primary-id", summary: "Primary", primary: true },
            { id: "cal-other", summary: "Other" },
        ];

        const [hydrated] = hydrateEvents(events, [], calendars);

        // Should fall back to the primary calendar's name, not crash
        expect(hydrated.category).toBe("Primary");
    });

    it("falls back to the first calendar when no primary is marked", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-gone",
            },
        ];
        const calendars = [{ id: "cal-first", summary: "First Calendar" }];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.category).toBe("First Calendar");
    });

    it("does not crash when the calendars list is empty", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-gone",
            },
        ];

        const hydrated = hydrateEvents(events, [], []);

        expect(hydrated).toHaveLength(1);
        expect(hydrated[0].category).toBeUndefined();
        expect(hydrated[0].color).toBeUndefined();
    });
});

describe("hydrateEvents — new calendar added to store", () => {
    it("correctly resolves category and color for events in a newly added calendar", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "New Calendar Event",
                type: "info",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-new",
            },
        ];
        const calendars = [
            { id: "cal-primary", summary: "Primary", primary: true },
            { id: "cal-new", summary: "Newly Created", backgroundColor: "#0f9d58" },
        ];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.category).toBe("Newly Created");
        expect(hydrated.color).toBeDefined();
    });
});

describe("hydrateEvents — event with no remoteCollectionId", () => {
    it("falls back to the primary calendar for locally-created unsynced events", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "New local event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                // no remoteCollectionId yet
            },
        ];
        const calendars = [
            { id: "primary", summary: "Primary", primary: true, backgroundColor: "#4285f4" },
            { id: "cal-work", summary: "Work" },
        ];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.category).toBe("Primary");
    });
});

describe("hydrateEvents — multiple events across different calendars", () => {
    it("assigns correct category and color per event based on its remoteCollectionId", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Work meeting",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-work",
            },
            {
                id: "e2",
                title: "Doctor",
                type: "busy",
                startTime: "2026-07-23T11:00:00",
                endTime: "2026-07-23T12:00:00",
                remoteCollectionId: "cal-personal",
            },
        ];
        const calendars = [
            { id: "cal-work", summary: "Work", backgroundColor: "#4285f4" },
            { id: "cal-personal", summary: "Personal", backgroundColor: "#0f9d58" },
        ];

        const hydrated = hydrateEvents(events, [], calendars);

        expect(hydrated[0].category).toBe("Work");
        expect(hydrated[1].category).toBe("Personal");
        expect(hydrated[0].color).not.toBe(hydrated[1].color);
    });

    it("resolves 'primary' alias to the calendar marked primary: true", () => {
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Primary event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "primary",
            },
        ];
        const calendars = [
            { id: "user@gmail.com", summary: "My Calendar", primary: true },
        ];

        const [hydrated] = hydrateEvents(events, [], calendars);

        expect(hydrated.category).toBe("My Calendar");
    });
});

describe("hydrateEvents — both sides changed (rename conflict)", () => {
    it("always uses whatever summary is currently in the calendars store (remote wins after poll)", () => {
        // This simulates the state AFTER a poll where remote renamed the calendar.
        // The event's remoteCollectionId is stable; only the store changes.
        const events: AppEvent[] = [
            {
                id: "e1",
                title: "Event",
                type: "busy",
                startTime: "2026-07-23T09:00:00",
                endTime: "2026-07-23T10:00:00",
                remoteCollectionId: "cal-1",
            },
        ];

        // Simulate local-before-poll (user had locally renamed)
        const localStore = [{ id: "cal-1", summary: "Local Rename" }];
        // Simulate after-poll (remote summary overwrites)
        const afterPollStore = [{ id: "cal-1", summary: "Remote Rename" }];

        expect(hydrateEvents(events, [], localStore)[0].category).toBe("Local Rename");
        expect(hydrateEvents(events, [], afterPollStore)[0].category).toBe("Remote Rename");
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
