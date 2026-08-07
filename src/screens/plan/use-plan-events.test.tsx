import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePlanEvents } from "./use-plan-events";

vi.mock("../../core/store/hooks", () => ({
    useCalendars: vi.fn<() => unknown[]>(() => [[
        { id: "cal1", summary: "Routine" },
        { id: "cal2", summary: "Work" }
    ]])
}));

describe("usePlanEvents", () => {
    it("getEventFilterValues returns sorted calendar summaries for category filter", () => {
        const { result } = renderHook(() => usePlanEvents([], [], new Date()));
        
        const filterValues = result.current.getEventFilterValues("category");
        expect(filterValues).toEqual(["Routine", "Work"]);
    });
});
