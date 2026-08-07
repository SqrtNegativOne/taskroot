/**
 * These tests exercise the calendar list merging logic that lives inside
 * EventSyncStrategy.fetchRemoteItems().  That logic is responsible for keeping
 * the local `calendars` store in sync with whatever Google Calendar reports.
 *
 * The merge contract:
 *   - Remote is authoritative for: id, summary, accessRole, backgroundColor,
 *     foregroundColor, primary
 *   - Local is authoritative for: active  (the user's visibility toggle)
 *   - Calendars absent from the remote response are dropped from the local store
 *   - New remote calendars default to active: true
 */

import { describe, it, expect } from "vitest";
import type { CalendarData } from "../../store/repositories";

// ---------------------------------------------------------------------------
// Pure extraction of the merge algorithm from EventSyncStrategy.fetchRemoteItems
// ---------------------------------------------------------------------------

type RemoteCalendar = Omit<CalendarData, "active">;

function mergeCalendars(
    remoteList: RemoteCalendar[],
    prevLocal: CalendarData[]
): CalendarData[] {
    return remoteList.map((c) => {
        const prev = prevLocal.find((pc) => pc.id === c.id);
        return {
            id: c.id,
            summary: c.summary,
            ...(c.accessRole !== undefined ? { accessRole: c.accessRole } : {}),
            active: prev ? prev.active : true,
            ...(c.backgroundColor !== undefined ? { backgroundColor: c.backgroundColor } : {}),
            ...(c.foregroundColor !== undefined ? { foregroundColor: c.foregroundColor } : {}),
            ...(c.primary !== undefined ? { primary: c.primary } : {}),
        };
    });
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

describe("mergeCalendars — baseline", () => {
    it("returns all remote calendars when local store is empty", () => {
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Primary", primary: true },
            { id: "c2", summary: "Work" },
        ];

        const result = mergeCalendars(remote, []);

        expect(result).toHaveLength(2);
        expect(result.every((c) => c.active)).toBe(true);
    });

    it("maps id, summary, accessRole, backgroundColor, foregroundColor, primary from remote", () => {
        const remote: RemoteCalendar[] = [
            {
                id: "c1",
                summary: "Work",
                accessRole: "owner",
                backgroundColor: "#4285f4",
                foregroundColor: "#ffffff",
                primary: true,
            },
        ];

        const [result] = mergeCalendars(remote, []);

        expect(result?.id).toBe("c1");
        expect(result?.summary).toBe("Work");
        expect(result?.accessRole).toBe("owner");
        expect(result?.backgroundColor).toBe("#4285f4");
        expect(result?.foregroundColor).toBe("#ffffff");
        expect(result?.primary).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Calendar renamed on Google side
// ---------------------------------------------------------------------------

describe("mergeCalendars — remote rename", () => {
    it("updates summary from remote, preserving the active flag", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Old Name", active: true }];
        const remote: RemoteCalendar[] = [{ id: "c1", summary: "New Name" }];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.summary).toBe("New Name");
        expect(result?.active).toBe(true);
    });

    it("preserves active: false when a calendar is renamed remotely", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Old Name", active: false }];
        const remote: RemoteCalendar[] = [{ id: "c1", summary: "New Name" }];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.summary).toBe("New Name");
        expect(result?.active).toBe(false);
    });

    it("handles simultaneous rename from remote: remote summary always wins", () => {
        // If the user also edits the local calendars store (e.g. future feature),
        // the next poll should overwrite with remote truth.
        const prev: CalendarData[] = [{ id: "c1", summary: "Local Name", active: true }];
        const remote: RemoteCalendar[] = [{ id: "c1", summary: "Remote Name" }];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.summary).toBe("Remote Name");
    });
});

// ---------------------------------------------------------------------------
// Calendar color changed on Google side
// ---------------------------------------------------------------------------

describe("mergeCalendars — remote color change", () => {
    it("picks up new backgroundColor from remote", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "Work", active: true, backgroundColor: "#old" },
        ];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Work", backgroundColor: "#4285f4" },
        ];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.backgroundColor).toBe("#4285f4");
    });

    it("picks up new foregroundColor from remote", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "Work", active: true, foregroundColor: "#old" },
        ];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Work", foregroundColor: "#ffffff" },
        ];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.foregroundColor).toBe("#ffffff");
    });

    it("clears color if remote omits it (calendar has no color configured)", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "Work", active: true, backgroundColor: "#old" },
        ];
        const remote: RemoteCalendar[] = [{ id: "c1", summary: "Work" }];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.backgroundColor).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Calendar deleted on Google side
// ---------------------------------------------------------------------------

describe("mergeCalendars — remote deletion", () => {
    it("drops a calendar that is no longer in the remote list", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "Primary", active: true, primary: true },
            { id: "c2", summary: "Work", active: true },
        ];
        const remote: RemoteCalendar[] = [{ id: "c1", summary: "Primary", primary: true }];

        const result = mergeCalendars(remote, prev);

        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("c1");
    });

    it("drops multiple deleted calendars in one pass", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "A", active: true },
            { id: "c2", summary: "B", active: true },
            { id: "c3", summary: "C", active: true },
        ];
        const remote: RemoteCalendar[] = [{ id: "c2", summary: "B" }];

        const result = mergeCalendars(remote, prev);

        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("c2");
    });

    it("results in empty list if remote returns no calendars", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Work", active: true }];

        const result = mergeCalendars([], prev);

        expect(result).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// New calendar created on Google side
// ---------------------------------------------------------------------------

describe("mergeCalendars — remote addition", () => {
    it("adds new calendar with active: true", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Primary", active: true }];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Primary" },
            { id: "c2", summary: "Newly Created" },
        ];

        const result = mergeCalendars(remote, prev);

        const newCal = result.find((c) => c.id === "c2");
        expect(newCal).toBeDefined();
        expect(newCal?.active).toBe(true);
        expect(newCal?.summary).toBe("Newly Created");
    });

    it("does not disturb existing calendars when a new one is added", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Primary", active: false }];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Primary" },
            { id: "c2", summary: "New" },
        ];

        const result = mergeCalendars(remote, prev);

        const existing = result.find((c) => c.id === "c1");
        expect(existing?.active).toBe(false); // user's toggle preserved
    });
});

// ---------------------------------------------------------------------------
// active flag — local authority
// ---------------------------------------------------------------------------

describe("mergeCalendars — active flag sovereignty", () => {
    it("preserves active: false when remote renames AND changes color simultaneously", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "Old", active: false, backgroundColor: "#aaa" },
        ];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "New", backgroundColor: "#4285f4" },
        ];

        const [result] = mergeCalendars(remote, prev);

        expect(result?.summary).toBe("New");
        expect(result?.backgroundColor).toBe("#4285f4");
        expect(result?.active).toBe(false);
    });

    it("new calendars default to active: true even if all existing are inactive", () => {
        const prev: CalendarData[] = [{ id: "c1", summary: "Primary", active: false }];
        const remote: RemoteCalendar[] = [
            { id: "c1", summary: "Primary" },
            { id: "c2", summary: "Imported" },
        ];

        const result = mergeCalendars(remote, prev);

        expect(result.find((c) => c.id === "c2")?.active).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

describe("mergeCalendars — ordering", () => {
    it("preserves the order of the remote response", () => {
        const prev: CalendarData[] = [
            { id: "c1", summary: "A", active: true },
            { id: "c2", summary: "B", active: true },
        ];
        const remote: RemoteCalendar[] = [
            { id: "c2", summary: "B" },
            { id: "c1", summary: "A" },
        ];

        const result = mergeCalendars(remote, prev);

        expect(result[0]?.id).toBe("c2");
        expect(result[1]?.id).toBe("c1");
    });
});
