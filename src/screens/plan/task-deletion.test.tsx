import "../../../vitest-setup.ts";
import React from "react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, beforeAll } from "vitest";
import { PlanScreen } from "./PlanScreen";

vi.mock("../../core/store/api", () => ({
    api: {
        subscribeToStore: (key, fallback, onUpdate, onReady) => {
            onReady();
            return () => {};
        },
        saveStoreData: () => {},
    },
}));

beforeAll(() => {
    // Mock matchMedia
    window.matchMedia =
        window.matchMedia ||
        function () {
            return {
                matches: false,
                addListener: function () {},
                removeListener: function () {},
            } as any;
        };

    // Mock ResizeObserver
    class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    window.ResizeObserver = ResizeObserver;
});

beforeEach(() => {
    localStorage.clear();
    // clear jsdom prompt/confirm
    window.confirm = vi.fn(() => true);
});

test("deleting a task also deletes its associated events", async () => {
    // Setup initial data to make test pass without complex unmounts
    const testTaskId = "test-task-1";

    const tasks = [
        {
            id: testTaskId,
            title: "Test Task for Deletion",
            status: "todo",
            priority: "P2",
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
            date: "2026-07-12",
            endDate: "2026-07-12",
            start: 0,
            end: 1440,
            type: "plan",
            isAllDay: true,
        },
        {
            id: "e2",
            title: "Unrelated Event",
            date: "2026-07-16",
            endDate: "2026-07-16",
            start: 600,
            end: 660,
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
    expect(taskRow?.textContent).toBe("Test Task for Deletion");

    const deleteButton = document.querySelector(
        '.task-row-actions button[title="Delete"]',
    );
    fireEvent.click(deleteButton!);

    // Wait for task to disappear
    await waitFor(() => {
        expect(document.querySelector(".task-row-title")).toBeNull();
    });

    // Now trigger an action that would write to localStorage, or simply wait
    // Actually our fix was to use setEvents which synchronously writes to localStorage
    const postDeleteEventsStr = localStorage.getItem("taskroot_events") || "[]";
    const postDeleteEvents = JSON.parse(postDeleteEventsStr);

    // e1 should be deleted (fix is already in place), e2 should remain
    expect(postDeleteEvents.some((e) => e.id === "e2")).toBe(true);
    // Wait, since we are doing `setEvents(es => es.filter...)` it will use what was in `events` state.
    // Did `events` state have e1 and e2?
    // It should, because useStored initialized it from localStorage!
    // But previously it failed because `api` mock was weird. Let's see if this passes now.
    expect(postDeleteEvents.some((e) => e.id === "e1")).toBe(false);
});
