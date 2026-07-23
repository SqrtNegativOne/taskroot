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
});
