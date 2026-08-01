import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAppEvent } from "../../utils/testUtils";
import { GoogleCalendarAPI } from "./GoogleCalendarAPI";
import * as api from "../../store/api";
vi.mock("../../store/api", () => ({
    fetchWithTimeout: vi.fn<(...args: never[]) => unknown>(),
}));

describe("GoogleCalendarAPI", () => {
    let googleCalendarAPI: GoogleCalendarAPI;
    const mockAuthManager = {
        getToken: vi.fn<() => string>().mockReturnValue("fake-token"),
        refreshAccessToken: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        mockAuthManager.getToken.mockReturnValue("fake-token");
        mockAuthManager.refreshAccessToken.mockResolvedValue(true);
        googleCalendarAPI = new GoogleCalendarAPI(mockAuthManager);
    });

    describe("fetchEvents", () => {
        it("requests events with proper parameters", async () => {
            const mockFetch = vi.mocked<typeof api.fetchWithTimeout>(api.fetchWithTimeout);
            mockFetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ items: [{ id: "e1" }] }), {
                    status: 200,
                })
            );

            const events = await googleCalendarAPI.fetchEvents(
                "2024-01-01T00:00:00Z",
                "2024-01-31T23:59:59Z",
            );

            expect(mockFetch).toHaveBeenCalledOnce();
            const url = mockFetch.mock.calls[0][0];
            expect(url).toContain("timeMin=2024-01-01T00:00:00Z");
            expect(url).toContain("timeMax=2024-01-31T23:59:59Z");
            expect(url).toContain("singleEvents=false");
            expect(url).toContain("maxResults=2500");

            expect(events).toHaveLength(1);
        });

        it("throws Unauthorized on 401 if refresh fails", async () => {
            const mockFetch = vi.mocked<typeof api.fetchWithTimeout>(api.fetchWithTimeout);
            mockFetch.mockResolvedValueOnce(
                new Response(undefined, { status: 401 })
            );
            mockAuthManager.refreshAccessToken.mockResolvedValueOnce(false);

            await expect(
                googleCalendarAPI.fetchEvents("start", "end"),
            ).rejects.toThrow("Unauthorized");
        });
    });

    describe("toGoogleEvent", () => {
        it("stores taskrootEventId in private extendedProperties", () => {
            const localEvent = createMockAppEvent({
                id: "e123",
                title: "Meeting",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, []);

            expect(
                googleEvent.extendedProperties?.private?.taskrootEventId,
            ).toBe("e123");
            expect(googleEvent.start?.dateTime).toContain("2024-05-10T10:00:00");
            expect(googleEvent.end?.dateTime).toContain("2024-05-10T11:00:00");
        });

        it("handles events ending at midnight (end >= 24)", () => {
            const localEvent = createMockAppEvent({
                id: "e123",
                title: "All day",
                startTime: "2024-05-10T00:00:00",
                endTime: "2024-05-11T00:00:00",
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, []);

            expect(googleEvent.start?.dateTime).toContain("2024-05-10T00:00:00");
            expect(googleEvent.end?.dateTime).toContain("2024-05-11T00:00:00");
        });

        it("uses start.date and end.date for all-day events", () => {
            const localEvent = createMockAppEvent({
                id: "e123",
                title: "All day event",
                startTime: "2024-05-10T00:00:00",
                endTime: "2024-05-11T00:00:00",
                isAllDay: true,
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, []);

            expect(googleEvent.start?.date).toBe("2024-05-10");
            expect(googleEvent.end?.date).toBe("2024-05-11");
            expect(googleEvent.summary).toBe("All day event");
            expect(googleEvent.start?.dateTime).toBeUndefined();
            expect(googleEvent.end?.dateTime).toBeUndefined();
        });

        it("maps event type to transparency", () => {
            const infoEvent = createMockAppEvent({
                id: "e1",
                type: "info",
                title: "Info",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
            });
            const busyEvent = createMockAppEvent({
                id: "e2",
                type: "plan",
                title: "Plan",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
            });

            const googleInfoEvent = googleCalendarAPI.toGoogleEvent(infoEvent, []);
            const googleBusyEvent = googleCalendarAPI.toGoogleEvent(busyEvent, []);

            expect(googleInfoEvent.transparency).toBe("transparent");
            expect(googleBusyEvent.transparency).toBe("opaque");
        });
    });

    describe("toLocalEvent", () => {
        it("extracts taskrootEventId from private extendedProperties", () => {
            const googleEvent = {
                id: "g123",
                summary: "Meeting",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                end: { dateTime: "2024-05-10T11:00:00Z" },
                extendedProperties: {
                    private: {
                        taskrootEventId: "e456",
                        type: "plan",
                    },
                },
            };

            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            expect(localEvent.id).toBe("e456");
            expect(localEvent.googleId).toBe("g123");
            expect(localEvent.title).toBe("Meeting");
        });

        it("uses transparency to determine default type for external events", () => {
            const googleEvent = {
                id: "g123",
                summary: "External Meeting",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                end: { dateTime: "2024-05-10T11:00:00Z" },
                transparency: "transparent",
            };

            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            expect(localEvent.type).toBe("info");

            const googleEvent2 = {
                id: "g124",
                summary: "External Busy Meeting",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                end: { dateTime: "2024-05-10T11:00:00Z" },
                transparency: "opaque",
            };

            const localEvent2 = googleCalendarAPI.toLocalEvent(googleEvent2);
            expect(localEvent2.type).toBe("busy");
        });

        it("extracts isAllDay from google events with start.date", () => {
            const googleEvent = {
                id: "g123",
                summary: "All day event",
                start: { date: "2024-05-10" },
                end: { date: "2024-05-11" },
            };

            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            expect(localEvent.isAllDay).toBe(true);
            expect(localEvent.startTime).toBe("2024-05-10T00:00:00");
            expect(localEvent.endTime).toBe("2024-05-11T00:00:00");
        });
    });

    describe("roundtrip", () => {
        it("preserves properties of a timed plan event after roundtripping to google and back", () => {
            const originalLocalEvent = createMockAppEvent({
                id: "e-roundtrip-1",
                taskId: "t-1",
                type: "plan",
                title: "Timed Meeting",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
                description: "Test description",
                rrule: "FREQ=WEEKLY",
            });
            
            const googleEvent = googleCalendarAPI.toGoogleEvent(originalLocalEvent, []);
            googleEvent.id = "g-1";
            googleEvent.updated = "2024-05-01T00:00:00.000Z";

            const restoredLocalEvent = googleCalendarAPI.toLocalEvent(googleEvent, "primary", "My Calendar");

            expect(restoredLocalEvent.id).toBe(originalLocalEvent.id);
            expect(restoredLocalEvent.taskId).toBe(originalLocalEvent.taskId);
            expect(restoredLocalEvent.type).toBe(originalLocalEvent.type);
            expect(restoredLocalEvent.title).toBe(originalLocalEvent.title);
            expect(restoredLocalEvent.startTime).toBe(originalLocalEvent.startTime);
            expect(restoredLocalEvent.endTime).toBe(originalLocalEvent.endTime);
            expect(restoredLocalEvent.rrule).toBe(originalLocalEvent.rrule);
            expect(restoredLocalEvent.isAllDay).toBe(false);
            expect(restoredLocalEvent.googleId).toBe("g-1");
        });

        it("preserves properties of an all-day event after roundtripping", () => {
            const originalLocalEvent = createMockAppEvent({
                id: "e-roundtrip-2",
                type: "info",
                title: "All Day Holiday",
                startTime: "2024-12-25T00:00:00",
                endTime: "2024-12-26T00:00:00",
                isAllDay: true,
            });

            const googleEvent = googleCalendarAPI.toGoogleEvent(originalLocalEvent, []);
            googleEvent.id = "g-2";
            googleEvent.updated = "2024-12-01T00:00:00.000Z";

            const restoredLocalEvent = googleCalendarAPI.toLocalEvent(googleEvent, "primary", "My Calendar");

            expect(restoredLocalEvent.id).toBe(originalLocalEvent.id);
            expect(restoredLocalEvent.title).toBe(originalLocalEvent.title);
            expect(restoredLocalEvent.startTime).toBe(originalLocalEvent.startTime);
            expect(restoredLocalEvent.endTime).toBe(originalLocalEvent.endTime);
            expect(restoredLocalEvent.isAllDay).toBe(true);
            expect(restoredLocalEvent.type).toBe(originalLocalEvent.type);
        });
    });
});
