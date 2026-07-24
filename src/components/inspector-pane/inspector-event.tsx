import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { RepeatSelect, Toggle, minToTime, timeToMin } from "./inspector-shared";

interface EventInspectorProps {
    event: AppEvent;
    tasks: AppTask[];
    calendars: { id: string, summary?: string, accessRole?: string }[];
    updateEvent: (id: string, updates: Partial<AppEvent>) => void;
    isReadOnlyCalendar: boolean;
}

export function EventInspector({
    event,
    tasks,
    calendars,
    updateEvent,
    isReadOnlyCalendar,
}: EventInspectorProps) {
    const [showEndDate, setShowEndDate] = React.useState(() => {
        return Boolean(event.endDate && event.date && event.endDate !== event.date);
    });

    return (
        <>
            <div
                className="inspector-field"
                style={{ marginTop: "8px" }}
            >
                <select
                    value={event.type}
                    disabled={isReadOnlyCalendar}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const type = e.target.value;
                        if (type === "plan") {
                            updateEvent(event.id, {
                                type,
                            });
                        } else {
                            updateEvent(event.id, {
                                type,
                                taskId: undefined,
                            });
                        }
                    }}
                >
                    <option value="busy">Busy</option>
                    <option value="info">
                        Informational
                    </option>
                    <option value="plan">
                        Plan (task-based)
                    </option>
                </select>
            </div>

            {event.type === "plan" && (
                <div className="inspector-field">
                    <select
                        value={event.taskId || ""}
                        disabled={isReadOnlyCalendar}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const taskId = e.target.value;
                            updateEvent(event.id, {
                                taskId: taskId || undefined,
                            });
                        }}
                    >
                        <option value="">
                            -- No task attached --
                        </option>
                        {tasks.map((t: AppTask) => (
                            <option key={t.id} value={t.id}>
                                {t.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div
                className="inspector-field"
                style={{ marginTop: "8px" }}
            >
                <label htmlFor={`calendar-${event.id}`}>Calendar</label>
                <select
                    id={`calendar-${event.id}`}
                    value={
                        event.googleCalendarId ||
                        "primary"
                    }
                    disabled={isReadOnlyCalendar}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const cal = calendars.find(
                            (c: { id: string, summary?: string }) => c.id === e.target.value,
                        );
                        updateEvent(event.id, {
                            googleCalendarId:
                                e.target.value,
                            category: cal
                                ? cal.summary
                                : "",
                        });
                    }}
                >
                    {calendars.map((c: any) => (
                        <option 
                            key={c.id} 
                            value={c.id}
                            disabled={c.accessRole === "reader" || c.accessRole === "freeBusyReader"}
                        >
                            {c.summary}{c.accessRole === "reader" || c.accessRole === "freeBusyReader" ? " (Read-Only)" : ""}
                        </option>
                    ))}
                </select>
            </div>

            <div
                className="inspector-field"
                style={{ marginTop: "8px" }}
            >
                <label htmlFor={`rrule-${event.id}`}>Repeat (RRULE)</label>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        width: "100%",
                    }}
                >
                    <RepeatSelect
                        value={event.rrule || ""}
                        disabled={isReadOnlyCalendar}
                        onChange={(e) =>
                            updateEvent(event.id, {
                                rrule: e.target.value || undefined,
                            })
                        }
                    />
                    <input
                        type="text"
                        placeholder="Custom RRULE (e.g. FREQ=WEEKLY;BYDAY=TU,TH)"
                        value={event.rrule || ""}
                        disabled={isReadOnlyCalendar}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateEvent(event.id, {
                                rrule:
                                    e.target.value ||
                                    undefined,
                            })
                        }
                    />
                </div>
            </div>

            <div
                className="inspector-field"
                style={{
                    gap: "20px",
                    padding: "8px 0",
                    flexDirection: "row",
                }}
            >
                <Toggle
                    label="End date"
                    checked={!!showEndDate}
                    disabled={isReadOnlyCalendar}
                    onChange={(checked: boolean) => {
                        if (isReadOnlyCalendar) return;
                        setShowEndDate(checked);
                        if (!checked)
                            updateEvent(event.id, {
                                endDate: event.date,
                            });
                    }}
                />
                <Toggle
                    label="Include time"
                    checked={!event.isAllDay}
                    disabled={isReadOnlyCalendar}
                    onChange={(checked: boolean) => {
                        if (isReadOnlyCalendar) return;
                        const updates: Partial<AppEvent> = {
                            isAllDay: !checked,
                        };
                        if (event.type !== "plan")
                            updates.type = !checked
                                ? "busy"
                                : "info";
                        updateEvent(
                            event.id,
                            updates,
                        );
                    }}
                />
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginTop: "16px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        flex: 1,
                    }}
                >
                    <input
                        type="date"
                        className="inspector-date-input"
                        value={String(event.date)}
                        disabled={isReadOnlyCalendar}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateEvent(event.id, {
                                date: e.target.value,
                            })
                        }
                    />
                    {!event.isAllDay && (
                        <input
                            type="time"
                            className="inspector-date-input"
                            value={minToTime(Number(event.start))}
                            disabled={isReadOnlyCalendar}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateEvent(
                                    event.id,
                                    {
                                        start: timeToMin(
                                            e.target.value,
                                        ),
                                    },
                                )
                            }
                        />
                    )}
                </div>

                {showEndDate && (
                    <div
                        style={{
                            color: "var(--fg-dim)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <span className="material-symbols-outlined">
                            arrow_forward
                        </span>
                    </div>
                )}

                {showEndDate && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            flex: 1,
                        }}
                    >
                        <input
                            type="date"
                            className="inspector-date-input"
                            value={String(event.endDate || event.date)}
                            min={String(event.date)}
                            disabled={isReadOnlyCalendar}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateEvent(
                                    event.id,
                                    {
                                        endDate:
                                            e.target.value,
                                    },
                                )
                            }
                        />
                        {!event.isAllDay && (
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={minToTime(
                                    event.end,
                                )}
                                disabled={isReadOnlyCalendar}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateEvent(
                                        event.id,
                                        {
                                            end: timeToMin(
                                                e.target
                                                    .value,
                                            ),
                                        },
                                    )
                                }
                            />
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
