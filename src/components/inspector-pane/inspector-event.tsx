import type { AppEvent, AppTask } from "../../core/domain/models";
import { RepeatSelect } from "./inspector-shared";
import { DateTimeGrid } from "./inspector-datetime";

import "./inspector.css";

interface EventInspectorProps {
    event: AppEvent;
    tasks: AppTask[];
    calendars: { id: string, summary?: string, accessRole?: string, primary?: boolean }[];
    updateEvent: (id: string, updates: Partial<AppEvent>) => void;
    isReadOnlyCalendar: boolean;
}



function EventTypeSelector({ event, tasks, updateEvent, isReadOnlyCalendar }: { event: AppEvent, tasks: AppTask[], updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    return (
        <>
            <div className="inspector-field inspector-field-group">
                <select
                    value={event.type}
                    disabled={isReadOnlyCalendar}
                    onChange={(e) => {
                        const type: "busy" | "info" = e.target.value === "busy" ? "busy" : "info";
                        updateEvent(event.id, { type });
                    }}
                >
                    <option value="busy">Busy</option>
                    <option value="info">Informational (Free)</option>
                </select>
            </div>
            <div className="inspector-field">
                <select
                    value={event.taskId || ""}
                    disabled={isReadOnlyCalendar}
                    onChange={(e) => updateEvent(event.id, { taskId: e.target.value || undefined })}
                >
                    <option value="">-- No task attached --</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
            </div>
        </>
    );
}

function EventCalendarSelector({ event, calendars, updateEvent, isReadOnlyCalendar }: { event: AppEvent, calendars: { id: string, summary?: string, accessRole?: string, primary?: boolean }[], updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    return (
        <div className="inspector-field inspector-field-group">
            <label htmlFor={`calendar-${event.id}`}>Calendar</label>
            <select
                id={`calendar-${event.id}`}
                value={event.googleCalendarId || calendars.find((c) => c.primary)?.id || "primary"}
                disabled={isReadOnlyCalendar}
                onChange={(e) => {
                    updateEvent(event.id, { googleCalendarId: e.target.value });
                }}
            >
                {calendars.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.accessRole !== "owner" && c.accessRole !== "writer"}>
                        {c.summary}{c.accessRole !== "owner" && c.accessRole !== "writer" ? " (Read-Only)" : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}

function EventRepeatControls({ event, updateEvent, isReadOnlyCalendar }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    return (
        <div className="inspector-field inspector-field-group">
            <label htmlFor={`rrule-${event.id}`}>Repeat (RRULE)</label>
            <div className="inspector-field-group" style={{ marginTop: 0 }}>
                <RepeatSelect
                    value={event.rrule || ""}
                    disabled={isReadOnlyCalendar}
                    onChange={(e) => updateEvent(event.id, { rrule: e.target.value || undefined })}
                />
                <input
                    type="text"
                    placeholder="Custom RRULE (e.g. FREQ=WEEKLY;BYDAY=TU,TH)"
                    value={event.rrule || ""}
                    disabled={isReadOnlyCalendar}
                    onChange={(e) => updateEvent(event.id, { rrule: e.target.value || undefined })}
                />
            </div>
        </div>
    );
}

export function EventInspector({ event, tasks, calendars, updateEvent, isReadOnlyCalendar }: EventInspectorProps) {
    return (
        <>
            <EventTypeSelector event={event} tasks={tasks} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />
            <EventCalendarSelector event={event} calendars={calendars} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />
            <EventRepeatControls event={event} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />

            <DateTimeGrid event={event} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />
        </>
    );
}
