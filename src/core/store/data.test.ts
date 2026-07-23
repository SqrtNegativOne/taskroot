import { describe, it, expect } from "vitest";
import { ymd, durationLabel } from "./data";

describe("Data Helper Functions", () => {
    it("ymd formats dates correctly to YYYY-MM-DD", () => {
        // Note: JavaScript months are 0-indexed! (0 = Jan, 11 = Dec)
        const date1 = new Date(2026, 0, 5); // Jan 5, 2026
        const date2 = new Date(1999, 11, 25); // Dec 25, 1999

        expect(ymd(date1)).toBe("2026-01-05");
        expect(ymd(date2)).toBe("1999-12-25");
    });

    it("durationLabel converts minutes to human readable strings", () => {
        expect(durationLabel(45)).toBe("45m");
        expect(durationLabel(60)).toBe("1h");
        expect(durationLabel(90)).toBe("1h 30m");
        expect(durationLabel(125)).toBe("2h 5m");
    });
});
