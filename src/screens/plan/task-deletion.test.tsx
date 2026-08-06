
import "../../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, beforeAll } from "vitest";
import { PlanScreen } from "./PlanScreen";
import { poller } from "../../core/sync";
import * as api from "../../core/store/api";
import { MockFetch } from "../../core/utils/testUtils";

const mockFetch = new MockFetch();
vi.spyOn(api, "fetchWithTimeout").mockImplementation(mockFetch.handler);

beforeAll(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn<(...args: never[]) => unknown>().mockImplementation((query: unknown) => ({
            matches: false,
            media: query,
            onchange: undefined,
            addListener: vi.fn<(...args: never[]) => unknown>(), // Deprecated
            removeListener: vi.fn<(...args: never[]) => unknown>(), // Deprecated
            addEventListener: vi.fn<(...args: never[]) => unknown>(),
            removeEventListener: vi.fn<(...args: never[]) => unknown>(),
            dispatchEvent: vi.fn<(...args: never[]) => unknown>(),
        })),
    });

    // Mock ResizeObserver
    vi.stubGlobal(
        "ResizeObserver",
        class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
});

beforeEach(() => {
    localStorage.clear();
    // clear jsdom prompt/confirm
    window.confirm = vi.fn<(...args: unknown[]) => boolean>(() => true);
});



test("deleting a task also deletes its associated events", async () => {
    // Setup initial data to make test pass without complex unmounts
    const testTaskId = "test-task-1";

    const tasks = [
        {
            id: testTaskId,
            title: "Test Task for Deletion",
            status: "todo",
            priority: 2,
            tags: [],
            subtasks: [],
            est: 60,
            added: new Date().toISOString(),
        },
    ];

    const events = [
        {
            id: "e1",
            taskId: testTaskId,
            title: "All Day Event",
            startTime: "2026-07-12",
            endTime: "2026-07-13",
            type: "busy",
        },
        {
            id: "e2",
            title: "Unrelated Event",
            startTime: "2026-07-16T10:00:00",
            endTime: "2026-07-16T11:00:00",
            type: "busy",
        },
    ];

    // Preload localStorage with our test data before rendering
    localStorage.setItem("taskroot_tasks", JSON.stringify(tasks));
    localStorage.setItem("taskroot_events", JSON.stringify(events));

    render(
        <MemoryRouter>
            <PlanScreen />
        </MemoryRouter>,
    );

    // Verify the task is rendered
    const taskRow = document.querySelector(".task-row-title");
    expect(taskRow).toBeTruthy();
    expect(taskRow?.textContent).toContain("Test Task for Deletion");

    const deleteButton = document.querySelector(
        '.task-row-actions button[title="Delete"]',
    );
    if (!deleteButton) throw new Error("deleteButton not found");
    fireEvent.click(deleteButton);

    // Wait for task to disappear
    await waitFor(() => {
        expect(document.querySelector(".task-row-title")).toBeNull();
    });

    // Verify that the task deletion also cascaded to delete the associated event in localStorage
    const postDeleteEventsStr = localStorage.getItem("taskroot_events") || "[]";
    const postDeleteEvents = JSON.parse(postDeleteEventsStr);

    expect(postDeleteEvents.some((e: { id: string }) => e.id === "e2")).toBe(true); // Unrelated event remains
    expect(postDeleteEvents.some((e: { id: string }) => e.id === "e1")).toBe(false); // Associated event is deleted
});
