import { describe, it, expect } from "vitest";
import {
    SETTINGS_SCHEMA,
    SETTINGS_TABS,
    DEFAULT_SETTINGS,
} from "./settingsSchema";

describe("settingsSchema.tsx", () => {
    it("should not have duplicate setting IDs", () => {
        const ids = SETTINGS_SCHEMA.map((s) => s.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });

    it("should compile DEFAULT_SETTINGS correctly from schema", () => {
        expect(DEFAULT_SETTINGS).toBeDefined();

        // Check a few known defaults
        expect(DEFAULT_SETTINGS.defaultCalendarView).toBe("month");
        expect(DEFAULT_SETTINGS.clockStyle).toBe("counter");
    });

    it("all tabs used in schema must be defined in SETTINGS_TABS", () => {
        const definedTabs = new Set(SETTINGS_TABS.map((t) => t.id));
        const usedTabs = SETTINGS_SCHEMA.map(s => s.tab).filter(Boolean);
        expect(usedTabs.every(tab => definedTabs.has(tab))).toBe(true);
    });

    it("should ensure bounded settings have valid min/max", () => {
        const boundedSettings = SETTINGS_SCHEMA.filter(s => s.min !== undefined && s.max !== undefined);
        expect(boundedSettings.every(s => s.max! >= s.min!)).toBe(true);
    });
});
