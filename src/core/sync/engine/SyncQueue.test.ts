import { describe, it, expect, beforeEach } from "vitest";
import { SyncQueue } from "./SyncQueue";
import { SyncAction, SyncType } from "./types";
import type { AppTask } from "../../domain/models";

describe("SyncQueue", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("should push items normally", () => {
        const queue = new SyncQueue();
        const task: AppTask = { id: "1", title: "Task 1" };
        
        queue.push({
            type: SyncType.Task,
            action: SyncAction.Create,
            item: task
        });

        expect(queue.length).toBe(1);
        expect(queue.peek()?.action).toBe(SyncAction.Create);
    });

    it("should deduplicate Update actions for the same task", () => {
        const queue = new SyncQueue();
        const task1: AppTask = { id: "1", title: "Task 1" };
        const task1Updated: AppTask = { id: "1", title: "Task 1 Updated" };
        
        queue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: task1
        });

        // Push an update for the same task
        queue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: task1Updated
        });

        expect(queue.length).toBe(1);
        const items = queue.getItems();
        expect(items[0].item.title).toBe("Task 1 Updated");
    });

    it("should not deduplicate Update actions for different tasks", () => {
        const queue = new SyncQueue();
        const task1: AppTask = { id: "1", title: "Task 1" };
        const task2: AppTask = { id: "2", title: "Task 2" };
        
        queue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: task1
        });

        queue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: task2
        });

        expect(queue.length).toBe(2);
    });

    it("should merge Update action into pending Create", () => {
        const queue = new SyncQueue();
        const task: AppTask = { id: "1", title: "Task 1" };
        
        queue.push({
            type: SyncType.Task,
            action: SyncAction.Create,
            item: task
        });

        queue.push({
            type: SyncType.Task,
            action: SyncAction.Update,
            item: { ...task, title: "Task 1 Updated" }
        });

        expect(queue.length).toBe(1);
        const items = queue.getItems();
        expect(items[0].action).toBe(SyncAction.Create);
        expect(items[0].item.title).toBe("Task 1 Updated");
    });
});
