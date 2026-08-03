import "../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DayTimeline } from "./day-timeline";
import { hydrateEvents } from "../core/domain/events";
import { createMockAppEvent } from "../core/utils/testUtils";

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
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            category: "Work",
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            category: "Personal",
        }),
        createMockAppEvent({
            id: "e3",
            title: "Event Three",
            startTime: `${todayStr}T13:20:00`,
            endTime: `${todayStr}T14:20:00`,
            type: "info",
        }),
    ];

    const filter = [{ column: "category", operator: "is", value: "Work" }];

    render(
        <DayTimeline
            events={hydrateEvents(events, tasks)}
            filter={filter}
            sort="time"
            filterMenu={undefined}
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
            dragState={undefined}
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
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            category: "Work",
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            category: "Personal",
        }),
    ];

    const filter = [{ column: "category", operator: "is not", value: "Work" }];

    render(
        <DayTimeline
            events={hydrateEvents(events, tasks)}
            filter={filter}
            sort="time"
            filterMenu={undefined}
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
            dragState={undefined}
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
