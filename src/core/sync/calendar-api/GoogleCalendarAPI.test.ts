import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAppEvent } from "../../utils/testUtils";
import type { AppEvent } from "../../domain/models";
import { GoogleCalendarAPI } from "./GoogleCalendarAPI";
import { ConflictError } from "../errors";
import { HTTP_PRECONDITION_FAILED } from "../../utils/constants";
import * as api from "../../store/api";
import { isEventAllDay } from "../../domain/events";

function assertIsAppEvent(event: unknown): asserts event is AppEvent {
    if (event && typeof event === "object" && "_deleted" in event) {
        throw new Error("Expected AppEvent, got deleted event");
    }
}

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

    describe("updateEvent", () => {
        it("sends If-Match header when localEvent has an etag", async () => {
            const mockFetch = vi.mocked(api.fetchWithTimeout);
            mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 200 }));

            await googleCalendarAPI.updateEvent("g123", createMockAppEvent({
                id: "e123",
                title: "Buy milk",
                etag: "version-1",
            }), undefined, { tasks: [], events: [] });

            const headers = mockFetch.mock.calls[0][1]?.headers;
            expect(headers).toHaveProperty("If-Match", "version-1");
        });

        it("throws ConflictError when API returns 412", async () => {
            const mockFetch = vi.mocked(api.fetchWithTimeout);
            mockFetch.mockResolvedValueOnce(new Response(undefined, { status: HTTP_PRECONDITION_FAILED }));

            await expect(googleCalendarAPI.updateEvent("goog-1", createMockAppEvent({
                id: "e1",
                title: "Buy milk",
                etag: "version-1",
            }), undefined, { tasks: [], events: [] })).rejects.toThrow(ConflictError);
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
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, { tasks: [], events: [] });

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
                startTime: "2024-05-10",
                endTime: "2024-05-11",
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, { tasks: [], events: [] });

            expect(googleEvent.start?.date).toBe("2024-05-10");
            expect(googleEvent.end?.date).toBe("2024-05-11");
        });

        it("uses start.date and end.date for all-day events", () => {
            const localEvent = createMockAppEvent({
                id: "e123",
                title: "All day event",
                startTime: "2024-05-10",
                endTime: "2024-05-11",
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, { tasks: [], events: [] });

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
                type: "busy",
                title: "Busy Task",
                taskId: "some-task-id",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
            });

            const googleInfoEvent = googleCalendarAPI.toGoogleEvent(infoEvent, { tasks: [], events: [] });
            const googleBusyEvent = googleCalendarAPI.toGoogleEvent(busyEvent, { tasks: [], events: [] });

            expect(googleInfoEvent.transparency).toBe("transparent");
            expect(googleBusyEvent.transparency).toBe("opaque");
        });

        it("includes exdates as EXDATE in recurrence array", () => {
            const localEvent = createMockAppEvent({
                id: "e1",
                title: "Recurring",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
                rrule: "FREQ=WEEKLY",
                exdates: ["20240517T100000Z", "20240524T100000Z"]
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, { tasks: [], events: [] });
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            expect(googleEvent.recurrence).toEqual([
                "RRULE:FREQ=WEEKLY",
                `EXDATE;TZID=${timeZone}:20240517T100000Z`,
                `EXDATE;TZID=${timeZone}:20240524T100000Z`,
            ]);
        });

        it("includes recurringEventId and originalStartTime for exceptions", () => {
            const localEvent = createMockAppEvent({
                id: "e1_exception",
                title: "Exception",
                startTime: "2024-05-17T10:00:00",
                endTime: "2024-05-17T11:00:00",
                recurringEventId: "master_id",
                originalStartTime: "2024-05-17T10:00:00"
            });
            const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, "master_id_google");
            expect(googleEvent.recurringEventId).toBe("master_id_google");
            expect(googleEvent.originalStartTime?.dateTime).toContain("2024-05-17T10:00:00");
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
                        type: "busy",
                    },
                },
            };

            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            assertIsAppEvent(localEvent);
            expect(localEvent.id).toBe("e456");
            expect(localEvent.remoteId).toBe("g123");
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
            assertIsAppEvent(localEvent);
            expect(localEvent.type).toBe("info");

            const googleEvent2 = {
                id: "g124",
                summary: "External Busy Meeting",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                end: { dateTime: "2024-05-10T11:00:00Z" },
                transparency: "opaque",
            };

            const localEvent2 = googleCalendarAPI.toLocalEvent(googleEvent2);
            assertIsAppEvent(localEvent2);
            expect(localEvent2.type).toBe("busy");
        });

        it("extracts date-only strings for all-day google events", () => {
            const googleEvent = {
                id: "g123",
                summary: "All day event",
                start: { date: "2024-05-10" },
                end: { date: "2024-05-11" },
            };

            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            assertIsAppEvent(localEvent);
            expect(isEventAllDay(localEvent)).toBe(true);
            expect(localEvent.startTime).toBe("2024-05-10");
            expect(localEvent.endTime).toBe("2024-05-11");
        });

        it("parses EXDATEs from recurrence array into exdates", () => {
            const googleEvent = {
                id: "g1",
                summary: "Recurring",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                end: { dateTime: "2024-05-10T11:00:00Z" },
                recurrence: [
                    "RRULE:FREQ=WEEKLY",
                    "EXDATE:20240517T100000Z",
                    "EXDATE;TZID=America/New_York:20240524T100000"
                ]
            };
            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            assertIsAppEvent(localEvent);
            expect(localEvent.rrule).toBe("FREQ=WEEKLY");
            expect(localEvent.exdates).toEqual(["20240517T100000Z", "20240524T100000"]);
        });

        it("parses recurringEventId and originalStartTime for exceptions", () => {
            const googleEvent = {
                id: "g1_exception",
                summary: "Exception",
                start: { dateTime: "2024-05-17T10:00:00Z" },
                end: { dateTime: "2024-05-17T11:00:00Z" },
                recurringEventId: "master_id",
                originalStartTime: { dateTime: "2024-05-17T10:00:00Z" }
            };
            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            assertIsAppEvent(localEvent);
            expect(localEvent.recurringEventId).toBe("master_id");
            expect(typeof localEvent.originalStartTime).toBe("string");
        });

        it("maps etag from google to local model", () => {
            const googleEvent = {
                id: "g123",
                summary: "Event with etag",
                start: { dateTime: "2024-05-10T10:00:00Z" },
                etag: "test-etag-123",
            };
            const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
            assertIsAppEvent(localEvent);
            expect(localEvent.etag).toBe("test-etag-123");
        });
    });

    describe("roundtrip", () => {
        it("preserves properties of a timed task event after roundtripping to google and back", () => {
            const originalLocalEvent = createMockAppEvent({
                id: "e-roundtrip-1",
                taskId: "t-1",
                type: "busy",
                title: "Timed Meeting",
                startTime: "2024-05-10T10:00:00",
                endTime: "2024-05-10T11:00:00",
                description: "Test description",
                rrule: "FREQ=WEEKLY",
            });
            
            const googleEvent = googleCalendarAPI.toGoogleEvent(originalLocalEvent, { tasks: [], events: [] });
            googleEvent.id = "g-1";
            googleEvent.updated = "2024-05-01T00:00:00.000Z";

            const restoredLocalEvent = googleCalendarAPI.toLocalEvent(googleEvent, "primary");
            assertIsAppEvent(restoredLocalEvent);

            expect(restoredLocalEvent.id).toBe(originalLocalEvent.id);
            expect(restoredLocalEvent.taskId).toBe(originalLocalEvent.taskId);
            expect(restoredLocalEvent.type).toBe(originalLocalEvent.type);
            expect(restoredLocalEvent.title).toBe(originalLocalEvent.title);
            expect(restoredLocalEvent.startTime).toBe(originalLocalEvent.startTime);
            expect(restoredLocalEvent.endTime).toBe(originalLocalEvent.endTime);
            expect(restoredLocalEvent.rrule).toBe(originalLocalEvent.rrule);
            expect(isEventAllDay(restoredLocalEvent)).toBe(false);
            expect(restoredLocalEvent.remoteId).toBe("g-1");
        });

        it("preserves properties of an all-day event after roundtripping", () => {
            const originalLocalEvent = createMockAppEvent({
                id: "e-roundtrip-2",
                type: "info",
                title: "All Day Holiday",
                startTime: "2024-12-25",
                endTime: "2024-12-26",
            });

            const googleEvent = googleCalendarAPI.toGoogleEvent(originalLocalEvent, { tasks: [], events: [] });
            googleEvent.id = "g-2";
            googleEvent.updated = "2024-12-01T00:00:00.000Z";

            const restoredLocalEvent = googleCalendarAPI.toLocalEvent(googleEvent, "primary");
            assertIsAppEvent(restoredLocalEvent);

            expect(restoredLocalEvent.id).toBe(originalLocalEvent.id);
            expect(restoredLocalEvent.title).toBe(originalLocalEvent.title);
            expect(restoredLocalEvent.startTime).toBe(originalLocalEvent.startTime);
            expect(restoredLocalEvent.endTime).toBe(originalLocalEvent.endTime);
            expect(isEventAllDay(restoredLocalEvent)).toBe(true);
            expect(restoredLocalEvent.type).toBe(originalLocalEvent.type);
        });
    });
});
