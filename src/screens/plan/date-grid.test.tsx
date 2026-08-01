
import "../../../vitest-setup.ts";

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DateGrid } from "./date-grid";
import { createMockAppEvent } from "../../core/utils/testUtils";
import { ymd } from "../../core/store/data";

test("filters events by category correctly", () => {
    const today = new Date("2026-07-23T12:00:00Z");
    const todayStr = ymd(today);

    // Fakes
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            category: "Work",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            category: "Personal",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e3",
            title: "Event Three",
            startTime: `${todayStr}T13:20:00`,
            endTime: `${todayStr}T14:20:00`,
            type: "info",
            isAllDay: false,
        }),
    ];

    const filter = [{ column: "category", operator: "is", value: "Work" }];

    render(
        <DateGrid
            view="month"
            setView={() => {}}
            anchor={today}
            setAnchor={() => {}}
            // eslint-disable-next-line typescript/consistent-type-assertions
            events={events as unknown as import("../../core/domain/events").HydratedEvent[]}
            filter={filter}
            sort="time"
            filterMenu={undefined}
            today={today}
            dragState={undefined}
            onEventDragStart={() => {}}
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
    const events = [
        createMockAppEvent({
            id: "e1",
            title: "Event One",
            startTime: `${todayStr}T10:00:00`,
            endTime: `${todayStr}T11:00:00`,
            type: "info",
            category: "Work",
            isAllDay: false,
        }),
        createMockAppEvent({
            id: "e2",
            title: "Event Two",
            startTime: `${todayStr}T11:40:00`,
            endTime: `${todayStr}T12:40:00`,
            type: "info",
            category: "Personal",
            isAllDay: false,
        }),
    ];

    const filter = [{ column: "category", operator: "is not", value: "Work" }];

    render(
        <DateGrid
            view="month"
            setView={() => {}}
            anchor={today}
            setAnchor={() => {}}
            // eslint-disable-next-line typescript/consistent-type-assertions
            events={events as unknown as import("../../core/domain/events").HydratedEvent[]}
            filter={filter}
            sort="time"
            filterMenu={undefined}
            today={today}
            dragState={undefined}
            onEventDragStart={() => {}}
            onAddEvent={() => {}}
        />
    );

    // Work event should be filtered out
    expect(screen.queryByText("Event One")).toBeNull();
    // Personal event should be visible
    expect(screen.queryByText("Event Two")).not.toBeNull();
});
