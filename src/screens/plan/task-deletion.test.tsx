
import "../../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, beforeAll } from "vitest";
import { PlanScreen } from "./PlanScreen";

vi.mock("../../core/store/api", () => ({
    api: {
        subscribeToStore: (_key: string, _fallback: unknown, _onUpdate: unknown, onReady: () => void) => {
            onReady();
            return () => {};
        },
        saveStoreData: () => {},
    },
}));

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
            startTime: "2026-07-12T00:00:00",
            endTime: "2026-07-13T00:00:00",
            type: "busy",
            isAllDay: true,
        },
        {
            id: "e2",
            title: "Unrelated Event",
            startTime: "2026-07-16T10:00:00",
            endTime: "2026-07-16T11:00:00",
            type: "busy",
            isAllDay: false,
        },
    ];

    // Instead of localStorage, we'll spy on React state setters if needed or we can just mock useStored
    // But since useStored is hard to mock without hoisting issues, we'll just test the deletion logic in UI directly.

    localStorage.setItem("taskroot_tasks", JSON.stringify(tasks));
    localStorage.setItem("taskroot_events", JSON.stringify(events));

    render(
        <MemoryRouter>
            <PlanScreen />
        </MemoryRouter>,
    );

    // Give it time to load from localStorage (it's synchronous actually)
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

    // Now trigger an action that would write to localStorage, or simply wait
    // Actually our fix was to use setEvents which synchronously writes to localStorage
    const postDeleteEventsStr = localStorage.getItem("taskroot_events") || "[]";
    const postDeleteEvents = JSON.parse(postDeleteEventsStr);

    // e1 should be deleted (fix is already in place), e2 should remain
    expect(postDeleteEvents.some((e: { id: string }) => e.id === "e2")).toBe(true);
    // Wait, since we are doing `setEvents(es => es.filter...)` it will use what was in `events` state.
    // Did `events` state have e1 and e2?
    // It should, because useStored initialized it from localStorage!
    // But previously it failed because `api` mock was weird. Let's see if this passes now.
    expect(postDeleteEvents.some((e: { id: string }) => e.id === "e1")).toBe(false);
});
