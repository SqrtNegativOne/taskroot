import { describe, it, expect } from "vitest";
import { computeFilterDefaults } from "./filters";

describe("computeFilterDefaults", () => {
    it("returns empty defaults for no filters", () => {
        expect(computeFilterDefaults([])).toEqual({});
    });

    it('infers status from "is" filter', () => {
        const filters = [{ column: "status", operator: "is", value: "done" }];
        expect(computeFilterDefaults(filters)).toEqual({ status: "done" });
    });

    it('infers priority from "is" filter', () => {
        const filters = [{ column: "priority", operator: "is", value: 3 }];
        expect(computeFilterDefaults(filters)).toEqual({ priority: 3 });
    });

    it('picks fallback status when "is not" filter excludes todo', () => {
        const filters = [
            { column: "status", operator: "is not", value: "todo" },
        ];
        expect(computeFilterDefaults(filters)).toEqual({ status: "next-up" }); // Because 'next-up' is next in fallback list
    });

    it('picks fallback status when multiple "is not" filters exclude top choices', () => {
        const filters = [
            { column: "status", operator: "is not", value: "todo" },
            { column: "status", operator: "is not", value: "next-up" },
            { column: "status", operator: "is not", value: "doing" },
        ];
        expect(computeFilterDefaults(filters)).toEqual({ status: "done" });
    });

    it('picks fallback priority when "is not" excludes 1', () => {
        const filters = [{ column: "priority", operator: "is not", value: 1 }];
        expect(computeFilterDefaults(filters)).toEqual({ priority: 2 });
    });

    it('does not apply conflicting "is" requirements', () => {
        const filters = [
            { column: "status", operator: "is", value: "todo" },
            { column: "status", operator: "is", value: "done" },
        ];
        expect(computeFilterDefaults(filters)).toEqual({});
    });

    it("does not apply value if it is both required and excluded", () => {
        const filters = [
            { column: "status", operator: "is", value: "done" },
            { column: "status", operator: "is not", value: "done" },
        ];
        expect(computeFilterDefaults(filters)).toEqual({});
    });

    it("adds tags correctly and ignores excluded tags", () => {
        const filters = [
            { column: "tag", operator: "is", value: "bug" },
            { column: "tag", operator: "is", value: "feature" },
            { column: "tag", operator: "is not", value: "bug" },
            { column: "tag", operator: "is not", value: "urgent" },
        ];
        // "bug" is excluded, so only "feature" should be included
        expect(computeFilterDefaults(filters)).toEqual({ tags: ["feature"] });
    });

    it("handles array values for 'is' status filtering correctly", () => {
        const filters = [
            { column: "status", operator: "is", value: ["todo", "next-up"] },
        ];
        // When multiple statuses are requested, computeFilterDefaults doesn't apply a single status
        // since a single task can't have multiple statuses simultaneously.
        expect(computeFilterDefaults(filters)).toEqual({});
    });

    it("handles array values for 'is not' status filtering", () => {
        const filters = [
            { column: "status", operator: "is not", value: ["todo", "next-up", "doing"] },
        ];
        // Excludes everything before "done"
        expect(computeFilterDefaults(filters)).toEqual({ status: "done" });
    });

    it("handles array values for tag filtering", () => {
        const filters = [
            { column: "tag", operator: "is", value: ["bug", "urgent"] },
        ];
        // "bug" and "urgent" are both added to defaults
        expect(computeFilterDefaults(filters)).toEqual({ tags: ["bug", "urgent"] });
    });

    it("handles array values for tag exclusion", () => {
        const filters = [
            { column: "tag", operator: "is", value: ["bug", "feature", "ui"] },
            { column: "tag", operator: "is not", value: ["bug", "ui"] },
        ];
        // "bug" and "ui" are excluded, leaving only "feature"
        expect(computeFilterDefaults(filters)).toEqual({ tags: ["feature"] });
    });

    it("handles mixed single and array values for exclusion", () => {
        const filters = [
            { column: "status", operator: "is not", value: ["todo"] },
            { column: "status", operator: "is not", value: "next-up" },
        ];
        // "todo" and "next-up" are excluded, so fallback is "doing"
        expect(computeFilterDefaults(filters)).toEqual({ status: "doing" });
    });

    it("ignores empty array values", () => {
        const filters = [
            { column: "status", operator: "is", value: [] },
            { column: "priority", operator: "is not", value: [] },
        ];
        expect(computeFilterDefaults(filters)).toEqual({});
    });
});
