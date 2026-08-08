import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAppTask } from "../../utils/testUtils";
import { GoogleTasksAPI } from "./GoogleTasksAPI";
import { ConflictError } from "../errors";
import { HTTP_PRECONDITION_FAILED } from "../../utils/constants";
import * as api from "../../store/api";
import { MockFetch } from "../../utils/testUtils";
import { FakeAuthManager } from "../auth/FakeAuthManager";

// eslint-disable-next-line max-lines-per-function
describe("GoogleTasksAPI", () => {
    let googleTasksAPI: GoogleTasksAPI;
    let fakeAuthManager: FakeAuthManager;
    let mockFetch: MockFetch;

    beforeEach(() => {
        vi.resetAllMocks();
        fakeAuthManager = new FakeAuthManager();
        mockFetch = new MockFetch();
        vi.spyOn(api, "fetchWithTimeout").mockImplementation(mockFetch.handler);
        googleTasksAPI = new GoogleTasksAPI(fakeAuthManager);
    });

    describe("fetchTasks", () => {
        it("handles pagination correctly", async () => {
            let requestCount = 0;
            mockFetch.mock("GET", "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", (urlStr) => {
                requestCount++;
                if (!urlStr.includes("pageToken")) {
                    return new Response(JSON.stringify({ items: [{ id: "task1" }], nextPageToken: "token123" }), { status: 200 });
                } else {
                    return new Response(JSON.stringify({ items: [{ id: "task2" }] }), { status: 200 });
                }
            });

            const result = await googleTasksAPI.fetchTasks();
            expect(result.isOk()).toBe(true);
            const tasks = result._unsafeUnwrap();

            expect(requestCount).toBe(2);
            expect(tasks).toHaveLength(2);
            expect(tasks?.[0]?.id).toBe("task1");
            expect(tasks?.[1]?.id).toBe("task2");
        });

        it("throws Unauthorized on 401 if refresh fails", async () => {
            mockFetch.mock("GET", "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", new Response(undefined, { status: 401 }));
            fakeAuthManager.setWillRefreshSuccess(false);

            const result = await googleTasksAPI.fetchTasks();
            expect(result.isErr()).toBe(true);
            expect(result._unsafeUnwrapErr().message).toBe("Unauthorized");
        });
    });

    describe("updateTask", () => {
        it("sends If-Match header when localTask has an etag", async () => {
            let receivedHeaders: HeadersInit | undefined;
            mockFetch.mock("PATCH", "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/g123", (_url, init) => {
                receivedHeaders = init?.headers;
                return new Response(undefined, { status: 200 });
            });

            await googleTasksAPI.updateTask("g123", {
                id: "t123",
                title: "Buy milk",
                etag: "version-1",
            });

            expect(new Headers(receivedHeaders).get("If-Match")).toBe("version-1");
        });

        it("throws ConflictError when API returns 412", async () => {
            mockFetch.mock("PATCH", "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/g123", new Response(undefined, { status: HTTP_PRECONDITION_FAILED }));

            const result = await googleTasksAPI.updateTask("g123", {
                id: "t123",
                title: "Buy milk",
                etag: "version-1",
            });
            expect(result.isErr()).toBe(true);
            expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
        });
    });

    describe("toGoogleTask", () => {
        it("prepends Taskroot Task ID to notes if not present", () => {
            const localTask: import("../../domain/models").AppTask = {
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
            const localTask: import("../../domain/models").AppTask = {
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
            expect(localTask).toMatchObject({ remoteId: "g123", status: "done" });
        });

        it("maps etag from google to local model", () => {
            const googleTask = {
                id: "g123",
                title: "Task with etag",
                etag: "test-etag-123",
            };
            const localTask = googleTasksAPI.toLocalTask(googleTask);
            if ('_deleted' in localTask) throw new Error("Expected AppTask");
            expect(localTask.etag).toBe("test-etag-123");
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

        it("parses sigils and strips them from the title", () => {
            const googleTask = {
                id: "g123",
                title: "Buy milk !! #errands tom",
                status: "needsAction",
            };
            const localTask = googleTasksAPI.toLocalTask(googleTask);
            if ('_deleted' in localTask) throw new Error("Expected AppTask");
            
            expect(localTask.title).toBe("Buy milk");
            expect(localTask.priority).toBe(3);
            expect(localTask.tags).toContain("errands");
            // Due date should be tomorrow, but we can just check if it's set or rely on the parser test
            // Note that `hasSigils` is true, so `updatedAt` is bumped to Date.now() which is > googleTask.updated
        });
    });
});
