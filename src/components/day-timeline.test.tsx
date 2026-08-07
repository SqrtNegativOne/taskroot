import "../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DayTimeline } from "./day-timeline";
import { hydrateEvents } from "../core/domain/events";
import { createMockAppEvent } from "../core/utils/testUtils";

import type { AppTask } from "../core/domain/models";
import { ymd } from "../core/store/data";

const CALENDARS = [
    { id: "cal-work", summary: "Work", primary: true },
    { id: "cal-personal", summary: "Personal" },
];

test("filters events by category correctly", () => {
    const today = new Date("2026-07-23T12:00:00Z");
    const todayStr = ymd(today);

    const tasks: AppTask[] = [];
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            remoteCollectionId: "cal-work",
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            remoteCollectionId: "cal-personal",
        }),
        createMockAppEvent({
            id: "e3",
            title: "Event Three",
            startTime: `${todayStr}T13:20:00`,
            endTime: `${todayStr}T14:20:00`,
            type: "info",
            // no calendar → falls back to primary ("Work")
        }),
    ];

    const filter = [{ column: "category", operator: "is", value: "Work" }];

    render(
        <DayTimeline
            events={hydrateEvents(events, tasks, CALENDARS)}
            filter={filter}
            sort="time"
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
            setDragState={() => {}}
            onDropToTime={() => {}}
            onResizeEvent={() => {}}
            onMoveEvent={() => {}}
            onEventClick={() => {}}
            onAddEvent={() => {}}
        />
    );

    // Work event (and the no-calendar event that falls back to primary/Work) should be visible
    expect(screen.queryByText("Event One")).not.toBeNull();
    // Personal event should be filtered out
    expect(screen.queryByText("Event Two")).toBeNull();
    // No-calendar event falls back to primary ("Work") — also visible
    expect(screen.queryByText("Event Three")).not.toBeNull();
});

test("filters out events by category correctly using 'is not'", () => {
    const today = new Date("2026-07-23T12:00:00Z");
    const todayStr = ymd(today);

    const tasks: AppTask[] = [];
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            remoteCollectionId: "cal-work",
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            remoteCollectionId: "cal-personal",
        }),
    ];

    const filter = [{ column: "category", operator: "is not", value: "Work" }];

    render(
        <DayTimeline
            events={hydrateEvents(events, tasks, CALENDARS)}
            filter={filter}
            sort="time"
            today={today}
            timelineDate={today}
            setTimelineDate={() => {}}
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
