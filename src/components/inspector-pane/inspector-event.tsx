import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { isDateString } from "../../core/domain/models";
import { RepeatSelect, minToTime, timeToMin, LabeledToggle } from "./inspector-shared";
import "./inspector.css";

interface EventInspectorProps {
    event: AppEvent;
    tasks: AppTask[];
    calendars: { id: string, summary?: string, accessRole?: string }[];
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
                        const val = e.target.value;
                        const type: "plan" | "busy" | "info" = val === "plan" ? "plan" : val === "busy" ? "busy" : "info";
                        updateEvent(event.id, type === "plan" ? { type } : { type, taskId: undefined });
                    }}
                >
                    <option value="busy">Busy</option>
                    <option value="info">Informational</option>
                    <option value="plan">Plan (task-based)</option>
                </select>
            </div>
            {event.type === "plan" && (
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
            )}
        </>
    );
}

function EventCalendarSelector({ event, calendars, updateEvent, isReadOnlyCalendar }: { event: AppEvent, calendars: { id: string, summary?: string, accessRole?: string }[], updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    return (
        <div className="inspector-field inspector-field-group">
            <label htmlFor={`calendar-${event.id}`}>Calendar</label>
            <select
                id={`calendar-${event.id}`}
                value={event.googleCalendarId || "primary"}
                disabled={isReadOnlyCalendar}
                onChange={(e) => {
                    const cal = calendars.find((c) => c.id === e.target.value);
                    updateEvent(event.id, { googleCalendarId: e.target.value, category: cal?.summary || "" });
                }}
            >
                {calendars.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.accessRole === "reader" || c.accessRole === "freeBusyReader"}>
                        {c.summary}{c.accessRole === "reader" || c.accessRole === "freeBusyReader" ? " (Read-Only)" : ""}
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

function EventTimeControls({ event, updateEvent, isReadOnlyCalendar, showEndDate }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean, showEndDate: boolean }) {
    return (
        <div className="inspector-time-controls">
            <div className="inspector-time-column">
                <input
                    type="date"
                    className="inspector-date-input"
                    value={String(event.date)}
                    disabled={isReadOnlyCalendar}
                    onChange={(e) => { if (isDateString(e.target.value)) updateEvent(event.id, { date: e.target.value }); }}
                />
                {!event.isAllDay && (
                    <input
                        type="time"
                        className="inspector-date-input"
                        value={minToTime(Number(event.start))}
                        disabled={isReadOnlyCalendar}
                        onChange={(e) => updateEvent(event.id, { start: timeToMin(e.target.value) })}
                    />
                )}
            </div>

            {showEndDate && (
                <>
                    <div className="inspector-time-arrow">
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                    <div className="inspector-time-column">
                        <input
                            type="date"
                            className="inspector-date-input"
                            value={String(event.endDate || event.date)}
                            min={String(event.date)}
                            disabled={isReadOnlyCalendar}
                            onChange={(e) => { if (isDateString(e.target.value)) updateEvent(event.id, { endDate: e.target.value }); }}
                        />
                        {!event.isAllDay && (
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={minToTime(event.end)}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => updateEvent(event.id, { end: timeToMin(e.target.value) })}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export function EventInspector({ event, tasks, calendars, updateEvent, isReadOnlyCalendar }: EventInspectorProps) {
    const [showEndDate, setShowEndDate] = React.useState(() => Boolean(event.endDate && event.date && event.endDate !== event.date));

    return (
        <>
            <EventTypeSelector event={event} tasks={tasks} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />
            <EventCalendarSelector event={event} calendars={calendars} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />
            <EventRepeatControls event={event} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} />

            <div className="inspector-field inspector-field-row">
                <LabeledToggle
                    label="End date"
                    checked={!!showEndDate}
                    disabled={isReadOnlyCalendar}
                    onChange={(checked) => {
                        if (isReadOnlyCalendar) return;
                        setShowEndDate(checked);
                        if (!checked) updateEvent(event.id, { endDate: event.date });
                    }}
                />
                <LabeledToggle
                    label="Include time"
                    checked={!event.isAllDay}
                    disabled={isReadOnlyCalendar}
                    onChange={(checked) => {
                        if (isReadOnlyCalendar) return;
                        const updates: Partial<AppEvent> = { isAllDay: !checked };
                        if (event.type !== "plan") updates.type = !checked ? "busy" : "info";
                        updateEvent(event.id, updates);
                    }}
                />
            </div>

            <EventTimeControls event={event} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} showEndDate={showEndDate} />
        </>
    );
}
