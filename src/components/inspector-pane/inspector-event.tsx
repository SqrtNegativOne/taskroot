import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { isDateString } from "../../core/domain/models";
import { minToTime } from "./inspector-utils";
import { timeToMin } from "./inspector-utils";
import { RepeatSelect } from "./inspector-shared";
import { Icon } from "../icon";


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

function EventCalendarSelector({ event, calendars, updateEvent, isReadOnlyCalendar }: { event: AppEvent, calendars: { id: string, summary?: string, accessRole?: string, primary?: boolean }[], updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    return (
        <div className="inspector-field inspector-field-group">
            <label htmlFor={`calendar-${event.id}`}>Calendar</label>
            <select
                id={`calendar-${event.id}`}
                value={event.googleCalendarId || calendars.find((c) => c.primary)?.id || "primary"}
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

function DateTimeGrid({ event, updateEvent, isReadOnlyCalendar, showEndDate, setShowEndDate }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean, showEndDate: boolean, setShowEndDate: (val: boolean) => void }) {
    const hasTime = !event.isAllDay;
    const hasEndDate = showEndDate;

    const handleAddEndDate = () => {
        if (isReadOnlyCalendar) return;
        setShowEndDate(true);
        if (!event.endDate || event.endDate < event.date) {
            updateEvent(event.id, { endDate: event.date });
        }
    };

    const handleRemoveEndDate = () => {
        if (isReadOnlyCalendar) return;
        setShowEndDate(false);
        updateEvent(event.id, { endDate: event.date });
    };

    const handleAddTime = () => {
        if (isReadOnlyCalendar) return;
        const updates: Partial<AppEvent> = { isAllDay: false };
        if (event.type !== "plan") updates.type = "busy";
        
        // Provide sensible defaults if the event lacks valid start/end times
        const s = Number(event.start);
        const e = Number(event.end);
        if (
            isNaN(s) || 
            isNaN(e) || 
            (s === 0 && (e === 0 || isNaN(e))) ||
            (s === 0 && e === 1440) || // All-day events often default to 00:00 -> 24:00
            s === e // Invalid zero-duration events
        ) {
            updates.start = 9 * 60; // 9:00 AM
            updates.end = 10 * 60;  // 10:00 AM
        }

        
        updateEvent(event.id, updates);
    };

    const handleRemoveTime = () => {
        if (isReadOnlyCalendar) return;
        const updates: Partial<AppEvent> = { isAllDay: true };
        if (event.type !== "plan") updates.type = "info";
        updateEvent(event.id, updates);
    };

    return (
        <div className="datetime-grid-container">
            <div className={`dtg-layout dtg-has-time-${hasTime} dtg-has-end-${hasEndDate}`}>
                {hasTime && (
                    <>
                        <div className="dtg-field dtg-time-start">
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={minToTime(Number(event.start))}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => updateEvent(event.id, { start: timeToMin(e.target.value) })}
                            />
                        </div>
                        <div className="dtg-arrow dtg-time-arrow">
                            <Icon name="arrow_forward" size={18} />
                        </div>
                        <div className="dtg-field dtg-time-end">
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={minToTime(event.end)}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => updateEvent(event.id, { end: timeToMin(e.target.value) })}
                            />
                        </div>
                        <div className="dtg-action dtg-time-action">
                            <button className="dtg-btn-icon" onClick={handleRemoveTime} disabled={isReadOnlyCalendar} title="Remove time">
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                    </>
                )}

                <div className="dtg-field dtg-date-start">
                    <input
                        type="date"
                        className="inspector-date-input"
                        value={String(event.date)}
                        disabled={isReadOnlyCalendar}
                        onChange={(e) => {
                            if (isDateString(e.target.value)) {
                                const updates: Partial<AppEvent> = { date: e.target.value };
                                if (event.endDate && event.endDate >= event.date) {
                                    if (event.endDate === event.date) {
                                        updates.endDate = e.target.value;
                                    } else if (e.target.value > event.endDate) {
                                        updates.endDate = e.target.value;
                                    }
                                }
                                updateEvent(event.id, updates);
                            }
                        }}
                    />
                </div>

                {hasEndDate ? (
                    <>
                        <div className="dtg-arrow dtg-date-arrow">
                            <Icon name="arrow_forward" size={18} />
                        </div>
                        <div className="dtg-field dtg-date-end">
                            <input
                                type="date"
                                className="inspector-date-input"
                                value={String(event.endDate || event.date)}
                                min={String(event.date)}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => { if (isDateString(e.target.value)) updateEvent(event.id, { endDate: e.target.value }); }}
                            />
                        </div>
                        <div className="dtg-action dtg-date-action">
                            <button className="dtg-btn-icon" onClick={handleRemoveEndDate} disabled={isReadOnlyCalendar} title="Remove end date">
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="dtg-inline-actions">
                        {!hasTime && (
                            <button className="dtg-btn-icon" onClick={handleAddTime} disabled={isReadOnlyCalendar} title="Add time">
                                <Icon name="more_time" size={18} />
                            </button>
                        )}
                        <button className="dtg-btn-icon" onClick={handleAddEndDate} disabled={isReadOnlyCalendar} title="Add end date">
                            <Icon name="transition_push" size={18} />
                        </button>
                    </div>
                )}

                {hasTime && !hasEndDate && (
                    <div className="dtg-bottom-actions">
                        <button className="dtg-btn-icon" onClick={handleAddEndDate} disabled={isReadOnlyCalendar} title="Add end date">
                            <Icon name="transition_push" size={18} />
                        </button>
                    </div>
                )}
            </div>
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

            <DateTimeGrid event={event} updateEvent={updateEvent} isReadOnlyCalendar={isReadOnlyCalendar} showEndDate={showEndDate} setShowEndDate={setShowEndDate} />
        </>
    );
}
