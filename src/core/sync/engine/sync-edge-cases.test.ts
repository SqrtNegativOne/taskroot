import { describe, it, expect, vi, beforeEach } from "vitest";
import { Synchronizer } from "./Synchronizer";
import { TaskSyncStrategy } from "./TaskSyncStrategy";
import { SyncQueue } from "./SyncQueue";

import type { ISyncEngineContext } from "./types";
import { SyncType, SyncAction } from "./types";
import type { AppTask } from "../../domain/models";
import { FakeTasksAPI } from "../task-api/FakeTasksAPI";
describe("Sync Engine - Edge Cases (Partial Payload & Merging)", () => {
    let mockContext: ISyncEngineContext;
    let pushQueue: SyncQueue;
    let localData: Map<string, any>;
    let tasksAPI: FakeTasksAPI;
    let synchronizer: Synchronizer<AppTask>;

    beforeEach(() => {
        localStorage.clear();
        localData = new Map();
        pushQueue = new SyncQueue();
        
        mockContext = {
            getLocalData: vi.fn((key: string) => localData.get(key) || []),
            setLocalData: vi.fn((key: string, data: any) => localData.set(key, data)),
            oldTasksMap: new Map(),
            oldEventsMap: new Map(),
            updateOldTasksMap: vi.fn((tasks: AppTask[]) => {
                mockContext.oldTasksMap = new Map(tasks.map(t => [t.id, t]));
            }),
            updateOldEventsMap: vi.fn(),
            getSettings: () => ({ enableTasksSync: true }),
            pushQueue,
            notifyError: vi.fn(),
            updateStatus: vi.fn()
        };

        tasksAPI = new FakeTasksAPI();
        const strategy = new TaskSyncStrategy(mockContext, tasksAPI);
        synchronizer = new Synchronizer(mockContext, strategy);
    });

    it("should merge local title edits with remote due date edits correctly", async () => {
        // 1. Initial state (synced)
        const t0 = 1000;
        const initialTask: AppTask = {
            id: "t1",
            remoteId: "g1",
            title: "Original Title",
            due: "2024-01-01",
            updatedAt: t0,
            etag: "v1",
            status: "todo",
            priority: 0,
            tags: [],
            subtasks: []
        };
        mockContext.setLocalData("tasks", [initialTask]);
        mockContext.updateOldTasksMap([initialTask]);

        // 2. User edits title locally at t1
        const t1 = 2000;
        const localEditedTask: AppTask = {
            ...initialTask,
            title: "Edited Local Title",
            updatedAt: t1
        };
        // The differ would push an update to the queue
        pushQueue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: localEditedTask,
            remoteId: "g1",
            updatedFields: ["title"]
        });

        // 3. Concurrently, someone edits the due date remotely at t2
        const t2 = 3000;
        // Mocking the raw data in the Fake API structure
        (tasksAPI as any).tasks["@default"] = [{
            id: "g1",
            title: "Original Title", // Title was not edited remotely
            due: "2024-12-31T00:00:00.000Z", // Due date WAS edited remotely
            updated: new Date(t2).toISOString(),
            etag: "v2"
        }];

        // 4. Poller runs. It should fetch the remote task, apply the optimistic overlay, 
        // and we expect the resulting local task to have BOTH the local title edit AND the remote due date.
        await synchronizer.poll();

        const resultingTasks = mockContext.getLocalData<AppTask[]>("tasks");
        expect(resultingTasks).toHaveLength(1);
        const finalTask = resultingTasks[0];

        // This assertion will fail with the current blind overwrite implementation!
        // Because applyOptimisticOverlay just overwrites the whole task from the queue,
        // destroying the remote due date edit.
        expect(finalTask.title).toBe("Edited Local Title");
        expect(finalTask.due).toBe("2024-12-31"); 
    });

    it("should merge local status edits with remote notes edits correctly", async () => {
        // 1. Initial state (synced)
        const t0 = 1000;
        const initialTask: AppTask = {
            id: "t2",
            remoteId: "g2",
            title: "Task 2",
            notes: "Original Notes",
            due: "2024-01-01",
            updatedAt: t0,
            etag: "v1",
            status: "todo",
            priority: 0,
            tags: [],
            subtasks: []
        };
        mockContext.setLocalData("tasks", [initialTask]);
        mockContext.updateOldTasksMap([initialTask]);

        // 2. User edits status locally at t1
        const t1 = 2000;
        const localEditedTask: AppTask = {
            ...initialTask,
            status: "done",
            updatedAt: t1
        };
        // The differ would push an update to the queue
        pushQueue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: localEditedTask,
            remoteId: "g2",
            updatedFields: ["status"]
        });

        // 3. Concurrently, someone edits the notes remotely at t2
        const t2 = 3000;
        (tasksAPI as any).tasks["@default"] = [{
            id: "g2",
            title: "Task 2",
            notes: "Edited Notes\nTaskroot Task ID: t2",
            status: "needsAction", // Status was not edited remotely (still todo equivalent)
            updated: new Date(t2).toISOString(),
            etag: "v2"
        }];

        // 4. Poller runs.
        await synchronizer.poll();

        const resultingTasks = mockContext.getLocalData<AppTask[]>("tasks");
        expect(resultingTasks).toHaveLength(1);
        const finalTask = resultingTasks[0];

        expect(finalTask.status).toBe("done");
        expect(finalTask.notes).toBe("Edited Notes\nTaskroot Task ID: t2");
    });
});
