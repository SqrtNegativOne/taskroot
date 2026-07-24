import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppTask } from "../domain/models";
import { createMockAppTask } from "../utils/testUtils";
import { GoogleTasksAPI } from "./GoogleTasksAPI";
import * as api from "../store/api";

vi.mock("../store/api", () => ({
    fetchWithTimeout: vi.fn(),
}));

describe("GoogleTasksAPI", () => {
    let googleTasksAPI: GoogleTasksAPI;

    beforeEach(() => {
        vi.resetAllMocks();
        googleTasksAPI = new GoogleTasksAPI();
        googleTasksAPI.setToken("fake-token");
    });

    describe("fetchTasks", () => {
        it("handles pagination correctly", async () => {
            const mockFetch = vi.mocked(api.fetchWithTimeout);

            // Page 1
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({ items: [{ id: "task1" }], nextPageToken: "token123" }),
                    { status: 200 }
                )
            );

            // Page 2
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({ items: [{ id: "task2" }], nextPageToken: undefined }),
                    { status: 200 }
                )
            );

            const tasks = await googleTasksAPI.fetchTasks();

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(tasks).toHaveLength(2);
            expect(tasks?.[0].id).toBe("task1");
            expect(tasks?.[1].id).toBe("task2");
        });

        it("throws Unauthorized on 401", async () => {
            const mockFetch = vi.mocked(api.fetchWithTimeout);
            mockFetch.mockResolvedValueOnce(
                new Response(null, { status: 401 })
            );

            await expect(googleTasksAPI.fetchTasks()).rejects.toThrow(
                "Unauthorized",
            );
        });
    });

    describe("toGoogleTask", () => {
        it("prepends Taskroot Task ID to notes if not present", () => {
            const localTask = {
                id: "t123",
                title: "Buy milk",
                status: "todo",
                notes: "2 percent",
            };
            const googleTask = googleTasksAPI.toGoogleTask(localTask);

            expect(googleTask.notes).toBe("Taskroot Task ID: t123\n2 percent");
            expect(googleTask.status).toBe("needsAction");
        });

        it("does not prepend if already present", () => {
            const localTask = {
                id: "t123",
                title: "Buy milk",
                status: "done",
                notes: "Taskroot Task ID: t123\n2 percent",
            };
            const googleTask = googleTasksAPI.toGoogleTask(localTask);

            expect(googleTask.notes).toBe("Taskroot Task ID: t123\n2 percent");
            expect(googleTask.status).toBe("completed");
        });
    });

    describe("toLocalTask", () => {
        it("extracts Taskroot Task ID from notes", () => {
            const googleTask = {
                id: "g123",
                title: "Buy milk",
                status: "completed",
                notes: "Taskroot Task ID: t456\nSome other stuff",
            };

            const localTask = googleTasksAPI.toLocalTask(googleTask);
            expect(localTask.id).toBe("t456");
            expect(localTask.googleTaskId).toBe("g123");
            expect(localTask.status).toBe("done");
        });

        it("handles deleted tasks", () => {
            const googleTask = {
                id: "g123",
                deleted: true,
                updated: "2023-01-01T00:00:00Z",
            };
            const localTask = googleTasksAPI.toLocalTask(googleTask, createMockAppTask({
                id: "t456",
            }));

            expect(localTask._deleted).toBe(true);
            expect(localTask.id).toBe("t456");
        });
    });
});
