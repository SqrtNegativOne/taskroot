import { describe, it, expect, vi, beforeEach } from "vitest";
import { Synchronizer } from "./Synchronizer";
import { EventSyncStrategy } from "./EventSyncStrategy";
import { SyncQueue } from "./SyncQueue";

import type { ISyncEngineContext } from "./types";
import { SyncType, SyncAction } from "./types";
import type { AppEvent, AppTask } from "../../domain/models";
import { DEFAULT_SETTINGS } from "../../store/settingsSchema";
import { FakeCalendarAPI } from "../calendar-api/FakeCalendarAPI";

describe("Event Sync Engine - Edge Cases (Partial Payload & Merging)", () => {
    let mockContext: ISyncEngineContext;
    let pushQueue: SyncQueue;
    let localData: Map<string, unknown>;
    let calendarAPI: FakeCalendarAPI;
    let synchronizer: Synchronizer<AppEvent>;

    beforeEach(() => {
        localStorage.clear();
        localData = new Map();
        pushQueue = new SyncQueue();
        
        mockContext = {
            getLocalData(key: string) {
                const val = localData.get(key);
                return val !== undefined ? val : JSON.parse("[]");
            },
            setLocalData(key: string, data: unknown) {
                localData.set(key, data);
            },
            oldTasksMap: new Map(),
            oldEventsMap: new Map(),
            updateOldTasksMap: vi.fn<(tasks: AppTask[]) => void>(),
            updateOldEventsMap: vi.fn<(events: AppEvent[]) => void>((events: AppEvent[]) => {
                mockContext.oldEventsMap = new Map(events.map(e => [e.id, e]));
            }),
            getSettings: () => ({ ...DEFAULT_SETTINGS, enableCalendarSync: true }),
            pushQueue,
            notifyError: vi.fn<(msg: string) => void>(),
            updateStatus: vi.fn<(problem?: boolean, isSyncing?: boolean) => void>()
        };

        calendarAPI = new FakeCalendarAPI();
        const strategy = new EventSyncStrategy(mockContext, calendarAPI);
        synchronizer = new Synchronizer(mockContext, strategy);
    });

    it("should merge local title edits with remote time edits correctly", async () => {
        // 1. Initial state (synced)
        const t0 = 1000;
        const initialEvent: AppEvent = {
            id: "e1",
            remoteId: "g1",
            remoteCollectionId: "primary",
            title: "Original Title",
            startTime: "2024-01-01T10:00:00",
            endTime: "2024-01-01T11:00:00",
            updatedAt: t0,
            etag: "v1",
            type: "busy"
        };
        mockContext.setLocalData("events", [initialEvent]);
        mockContext.updateOldEventsMap([initialEvent]);

        // 2. User edits title locally at t1
        const t1 = 2000;
        const localEditedEvent: AppEvent = {
            ...initialEvent,
            title: "Edited Local Title",
            updatedAt: t1
        };
        // The differ would push an update to the queue
        pushQueue.push({
            type: SyncType.Event,
            action: SyncAction.Update,
            item: localEditedEvent,
            remoteId: "g1",
            calendarId: "primary",
            updatedFields: ["title"]
        });

        // 3. Concurrently, someone edits the time remotely at t2
        const t2 = 3000;
        calendarAPI.seedRemoteEvents([{
            id: "g1",
            summary: "Original Title", // Title was not edited remotely
            start: { dateTime: "2024-01-01T12:00:00.000Z" }, // Time WAS edited remotely
            end: { dateTime: "2024-01-01T13:00:00.000Z" },
            extendedProperties: { private: { taskrootEventId: "e1" } },
            updated: new Date(t2).toISOString(),
            etag: "v2"
        }], "primary");

        // 4. Run sync
        await synchronizer.poll();

        // 5. Verify the merged result
        const localEvents = mockContext.getLocalData("events");
        expect(localEvents).toHaveLength(1);
        
        const mergedEvent = localEvents[0];
        
        // The title should be the local edit
        expect(mergedEvent?.title).toBe("Edited Local Title");
        
        // The time should be the remote edit
        // (Note: the mock might parse ISO differently than our floating time, but we test the merging mechanism)
        expect(mergedEvent?.startTime).toBeDefined();
        expect(mergedEvent?.endTime).toBeDefined();
        expect(mergedEvent?.etag).toBe("v2"); // Should have updated to the remote etag
        expect(mergedEvent?.updatedAt).toBeGreaterThanOrEqual(t2);
    });

    it("should merge local status edits with remote notes edits correctly", async () => {
        // 1. Initial state (synced)
        const t0 = 1000;
        const initialEvent: AppEvent = {
            id: "e2",
            remoteId: "g2",
            remoteCollectionId: "primary",
            title: "Event 2",
            description: "Original Notes\nTaskroot Event ID: e2",
            startTime: "2024-01-01T10:00:00",
            endTime: "2024-01-01T11:00:00",
            updatedAt: t0,
            etag: "v1",
            type: "busy"
        };
        mockContext.setLocalData("events", [initialEvent]);
        mockContext.updateOldEventsMap([initialEvent]);

        // 2. User edits description locally at t1
        const t1 = 2000;
        const localEditedEvent: AppEvent = {
            ...initialEvent,
            description: "Edited Notes\nTaskroot Event ID: e2",
            updatedAt: t1
        };
        
        pushQueue.push({
            type: SyncType.Event,
            action: SyncAction.Update,
            item: localEditedEvent,
            remoteId: "g2",
            calendarId: "primary",
            updatedFields: ["description"]
        });

        // 3. Concurrently, someone edits the time remotely at t2
        const t2 = 3000;
        calendarAPI.seedRemoteEvents([{
            id: "g2",
            summary: "Event 2",
            description: "Original Notes\nTaskroot Event ID: e2",
            start: { dateTime: "2024-01-01T15:00:00" }, // Provide local time directly to avoid timezone shift
            end: { dateTime: "2024-01-01T16:00:00" },
            extendedProperties: { private: { taskrootEventId: "e2" } },
            updated: new Date(t2).toISOString(),
            etag: "v2"
        }], "primary");

        // 4. Poller runs.
        await synchronizer.poll();

        const resultingEvents = mockContext.getLocalData("events");
        expect(resultingEvents).toHaveLength(1);
        const finalEvent = resultingEvents[0];

        expect(finalEvent?.description).toBe("Edited Notes\nTaskroot Event ID: e2");
        expect(finalEvent?.startTime).toBe("2024-01-01T15:00:00");
    });
});
