import "../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DayTimeline } from "./day-timeline";
import { createMockAppEvent } from "../core/utils/testUtils";
import type { AppEvent as DomainAppEvent } from "../core/domain/events";
import type { AppTask } from "../core/domain/models";
import { ymd } from "../core/store/data";

test("filters events by category correctly", () => {
    const today = new Date("2026-07-23T12:00:00Z");
    const todayStr = ymd(today);

    // Fakes
    const tasks: AppTask[] = [];
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            date: todayStr,
            start: 600,
            end: 660,
            type: "info",
            category: "Work",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            date: todayStr,
            start: 700,
            end: 760,
            type: "info",
            category: "Personal",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e3",
            title: "Event Three",
            date: todayStr,
            start: 800,
            end: 860,
            type: "info",
            isAllDay: false,
        }),
    ];

    const filter = [{ column: "category", operator: "is", value: "Work" }];

    render(
        <DayTimeline
            events={events as unknown as DomainAppEvent[]}
            tasks={tasks}
            filter={filter}
            sort="time"
            filterMenu={null}
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
            dragState={null}
            setDragState={() => {}}
            onDropToTime={() => {}}
            onResizeEvent={() => {}}
            onMoveEvent={() => {}}
            onEventClick={() => {}}
            onAddEvent={() => {}}
        />
    );

    // Work event should be visible
    expect(screen.queryByText("Event One")).not.toBeNull();
    // Others should be filtered out
    expect(screen.queryByText("Event Two")).toBeNull();
    expect(screen.queryByText("Event Three")).toBeNull();
});

test("filters out events by category correctly using 'is not'", () => {
    const today = new Date("2026-07-23T12:00:00Z");
    const todayStr = ymd(today);

    // Fakes
    const tasks: AppTask[] = [];
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            date: todayStr,
            start: 600,
            end: 660,
            type: "info",
            category: "Work",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            date: todayStr,
            start: 700,
            end: 760,
            type: "info",
            category: "Personal",
            isAllDay: false,
        }),
    ];

    const filter = [{ column: "category", operator: "is not", value: "Work" }];

    render(
        <DayTimeline
            events={events as unknown as DomainAppEvent[]}
            tasks={tasks}
            filter={filter}
            sort="time"
            filterMenu={null}
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
            dragState={null}
            setDragState={() => {}}
            onDropToTime={() => {}}
            onResizeEvent={() => {}}
            onMoveEvent={() => {}}
            onEventClick={() => {}}
            onAddEvent={() => {}}
        />
    );

    // Work event should be filtered out
    expect(screen.queryByText("Event One")).toBeNull();
    // Personal event should be visible
    expect(screen.queryByText("Event Two")).not.toBeNull();
});
