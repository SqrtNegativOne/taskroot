import { describe, it, expect } from "vitest";
import { computeEventDeltaActions } from "./event-differ";
import { SyncAction, SyncType } from "./types";
import type { SyncQueueItem } from "./types";
import { createMockAppEvent } from "../../utils/testUtils";

const T0 = 1000;
const T1 = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EventQueueItem = Extract<SyncQueueItem, { type: typeof SyncType.Event }>;

function findEventAction(actions: SyncQueueItem[], action: SyncAction): EventQueueItem | undefined {
    return actions.find((a): a is EventQueueItem => a.type === SyncType.Event && a.action === action);
}

function asMap(...events: ReturnType<typeof createMockAppEvent>[]) {
    return new Map(events.map((e) => [e.id, e]));
}

// ---------------------------------------------------------------------------
// Event creation
// ---------------------------------------------------------------------------

describe("computeEventDeltaActions — event creation", () => {
    it("queues a Create for a new synced event with a remoteCollectionId", () => {
        const newEvent = createMockAppEvent({
            id: "e1",
            title: "Team standup",
            remoteCollectionId: "cal-work",
        });

        const actions = computeEventDeltaActions([newEvent], new Map());

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: SyncType.Event,
            action: SyncAction.Create,
            item: newEvent,
        });
    });

    it("queues a Create for an event with no remoteCollectionId (will target primary)", () => {
        const newEvent = createMockAppEvent({ id: "e1", title: "Quick note" });

        const actions = computeEventDeltaActions([newEvent], new Map());

        expect(actions).toHaveLength(1);
        expect(actions[0].action).toBe(SyncAction.Create);
    });

    it("does NOT queue a Create for an event that already has a remoteId", () => {
        const syncedEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
        });

        const actions = computeEventDeltaActions([syncedEvent], new Map());

        expect(actions).toHaveLength(0);
    });

    it("does NOT queue a Create for a log event", () => {
        const logEvent = createMockAppEvent({ id: "e1", type: "log" });

        const actions = computeEventDeltaActions([logEvent], new Map());

        expect(actions).toHaveLength(0);
    });

    it("does NOT queue a Create for a blank-title event (draft guard)", () => {
        const draft = createMockAppEvent({ id: "e1", title: "   " });

        const actions = computeEventDeltaActions([draft], new Map());

        expect(actions).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Event deletion
// ---------------------------------------------------------------------------

describe("computeEventDeltaActions — event deletion", () => {
    it("queues a Delete when a known event is removed from the local store", () => {
        const deletedEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            updatedAt: T0,
        });
        const oldMap = asMap(deletedEvent);

        const actions = computeEventDeltaActions([], oldMap);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            action: SyncAction.Delete,
            remoteId: "goog-1",
            calendarId: "cal-work",
        });
    });

    it("Delete uses 'primary' as calendarId when remoteCollectionId is absent", () => {
        const deletedEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            updatedAt: T0,
        });
        const oldMap = asMap(deletedEvent);

        const actions = computeEventDeltaActions([], oldMap);

        expect(actions[0].calendarId).toBe("primary");
    });

    it("does NOT queue a Delete for a log event that was removed", () => {
        const logEvent = createMockAppEvent({ id: "e1", type: "log", updatedAt: T0 });
        const oldMap = asMap(logEvent);

        const actions = computeEventDeltaActions([], oldMap);

        expect(actions).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Event update (same calendar)
// ---------------------------------------------------------------------------

describe("computeEventDeltaActions — event update", () => {
    it("queues an Update when title changes (updatedAt bumped)", () => {
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            title: "Old title",
            updatedAt: T0,
        });
        const currentEvent = { ...oldEvent, title: "New title", updatedAt: T1 };

        const actions = computeEventDeltaActions([currentEvent], asMap(oldEvent));

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ action: SyncAction.Update });
    });

    it("does NOT queue an Update when updatedAt has not changed", () => {
        const event = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            title: "Same title",
            updatedAt: T0,
        });

        const actions = computeEventDeltaActions([event], asMap(event));

        expect(actions).toHaveLength(0);
    });

    it("does NOT queue an Update when updatedAt is older than the snapshot", () => {
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            updatedAt: T1,
        });
        const staleEvent = { ...oldEvent, updatedAt: T0 };

        const actions = computeEventDeltaActions([staleEvent], asMap(oldEvent));

        expect(actions).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Calendar change (Move)
// ---------------------------------------------------------------------------

describe("computeEventDeltaActions — calendar change", () => {
    it("queues Move + Update when remoteCollectionId changes", () => {
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            updatedAt: T0,
        });
        const movedEvent = { ...oldEvent, remoteCollectionId: "cal-personal", updatedAt: T1 };

        const actions = computeEventDeltaActions([movedEvent], asMap(oldEvent));

        const moveAction = findEventAction(actions, SyncAction.Move);
        const updateAction = findEventAction(actions, SyncAction.Update);

        expect(moveAction).toBeDefined();
        expect(moveAction).toMatchObject({
            calendarId: "cal-work",
            destinationCalendarId: "cal-personal",
            remoteId: "goog-1",
        });
        expect(updateAction).toBeDefined();
    });

    it("does NOT queue a Move when the old event has no remoteId (never synced)", () => {
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteCollectionId: "cal-work",
            updatedAt: T0,
        });
        const movedEvent = { ...oldEvent, remoteCollectionId: "cal-personal", updatedAt: T1 };

        const actions = computeEventDeltaActions([movedEvent], asMap(oldEvent));

        // Cannot move something Google doesn't know about yet
        expect(actions.every((a) => a.action !== SyncAction.Move)).toBe(true);
    });

    it("uses remoteCollectionId (not category) to determine the target calendar", () => {
        // Under the new scheme, only remoteCollectionId drives calendar routing.
        // A stale category string pointing elsewhere must not override it.
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            updatedAt: T0,
        });
        const currentEvent = {
            ...oldEvent,
            remoteCollectionId: "cal-personal",
            // stale category field present — must be ignored
            category: "Work",
            updatedAt: T1,
        };

        const actions = computeEventDeltaActions([currentEvent], asMap(oldEvent));

        const moveAction = findEventAction(actions, SyncAction.Move);
        expect(moveAction?.destinationCalendarId).toBe("cal-personal");
    });

    it("Update action targets the destination calendar after a move", () => {
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-work",
            title: "Meeting",
            updatedAt: T0,
        });
        const movedEvent = { ...oldEvent, remoteCollectionId: "cal-personal", updatedAt: T1 };

        const actions = computeEventDeltaActions([movedEvent], asMap(oldEvent));

        const updateAction = findEventAction(actions, SyncAction.Update);
        expect(updateAction?.calendarId).toBe("cal-personal");
    });
});

// ---------------------------------------------------------------------------
// Calendar deleted / orphaned remoteCollectionId
// ---------------------------------------------------------------------------

describe("computeEventDeltaActions — orphaned calendar references", () => {
    it("still queues an Update for an event whose calendar was deleted from Google", () => {
        // Calendar "cal-deleted" is gone from the store, but the event still has that ID.
        // The differ must not silently drop the update; it should still push it.
        const oldEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-deleted",
            title: "Old title",
            updatedAt: T0,
        });
        const currentEvent = { ...oldEvent, title: "New title", updatedAt: T1 };

        const actions = computeEventDeltaActions([currentEvent], asMap(oldEvent));

        expect(actions.some((a) => a.action === SyncAction.Update)).toBe(true);
    });

    it("Delete action still includes the old calendarId even when that calendar is gone", () => {
        const deletedEvent = createMockAppEvent({
            id: "e1",
            remoteId: "goog-1",
            remoteCollectionId: "cal-deleted",
            updatedAt: T0,
        });
        const oldMap = asMap(deletedEvent);

        const actions = computeEventDeltaActions([], oldMap);

        expect(actions[0].calendarId).toBe("cal-deleted");
    });
});
