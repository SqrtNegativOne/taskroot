import re

with open('src/core/sync/calendar-api/GoogleCalendarAPI.ts', 'r', encoding='utf-8') as f:
    s = f.read()

replacement = """
function getEventId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    const desc = googleEvent.description || "";
    if (priv?.taskrootEventId) return priv.taskrootEventId;
    const match = desc.match(/Taskroot Event ID: (e[0-9a-zA-Z-]+)/);
    if (match) return match[1];
    return googleEvent.id || "";
}

function getEventTaskId(googleEvent: gapi.client.calendar.Event) {
    const priv = googleEvent.extendedProperties?.private;
    const desc = googleEvent.description || "";
    if (priv?.taskId) return priv.taskId;
    const match = desc.match(/Task ID: (t\\d+)/);
    return match ? match[1] : null;
}

function extractEventMetadata(googleEvent: gapi.client.calendar.Event) {
    const taskId = getEventTaskId(googleEvent);
    const id = getEventId(googleEvent);
    const type = googleEvent.extendedProperties?.private?.type || (taskId ? "plan" : (googleEvent.start?.date ? "info" : "busy"));
    return { taskId, id, type };
}
"""

s = re.sub(r'function extractEventMetadata\(googleEvent: gapi\.client\.calendar\.Event\) \{.*?\n\}', replacement.strip(), s, flags=re.DOTALL)

replacement2 = """
    toLocalEvent(googleEvent: gapi.client.calendar.Event, calendarId = "primary", calendarSummary = "") {
        if (googleEvent.status === "cancelled") {
            const privateProps = googleEvent.extendedProperties?.private;
            return {
                id: (privateProps ? privateProps.taskrootEventId : null) || googleEvent.id || "",
                _deleted: true,
                updatedAt: new Date(googleEvent.updated || 0).getTime(),
            };
        }
        const { date, start, end } = extractEventTime(googleEvent);
        const { taskId, id, type } = extractEventMetadata(googleEvent);
        let rrule: string | undefined = undefined;
        if (googleEvent.recurrence) {
            const r = googleEvent.recurrence.find((r) => r.startsWith("RRULE:"));
            if (r) rrule = r.replace(/^RRULE:/i, "");
        }

        return {
            id: id || "", googleEventId: googleEvent.id, googleCalendarId: calendarId, taskId,
            title: googleEvent.summary || "Untitled Event", date: date || "", start: start || 0, end: end || 0, type,
            category: calendarSummary, rrule,
            updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now(),
        };
    }
"""

s = re.sub(r'    toLocalEvent\(googleEvent: gapi\.client\.calendar\.Event, calendarId = "primary", calendarSummary = ""\) \{.*?\n    \}', replacement2.strip('\n'), s, flags=re.DOTALL)

with open('src/core/sync/calendar-api/GoogleCalendarAPI.ts', 'w', encoding='utf-8') as f:
    f.write(s)
