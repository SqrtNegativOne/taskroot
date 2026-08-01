import React from "react";
import type { AppEvent } from "../../core/domain/models";
import { isDateString } from "../../core/domain/models";
import { minToTime, timeToMin } from "./inspector-utils";
import { Icon } from "../icon";
import { MINUTES_IN_HOUR, MINUTES_PER_DAY } from "../../core/utils/constants";

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 10;

export function DateTimeGrid({ event, updateEvent, isReadOnlyCalendar, showEndDate, setShowEndDate }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean, showEndDate: boolean, setShowEndDate: (val: boolean) => void }) {
    const hasTime = !event.isAllDay;
    const hasEndDate = showEndDate;

    const [localTime, setLocalTime] = React.useState<{ start: number, end: number } | undefined>(undefined);

    React.useEffect(() => {
        setLocalTime(undefined);
    }, [event.start, event.end]);

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
        
        const s = Number(event.start);
        const e = Number(event.end);
        if (
            isNaN(s) || 
            isNaN(e) || 
            (s === 0 && (e === 0 || isNaN(e))) ||
            (s === 0 && e === MINUTES_PER_DAY) ||
            s === e
        ) {
            updates.start = DEFAULT_START_HOUR * MINUTES_IN_HOUR;
            updates.end = DEFAULT_END_HOUR * MINUTES_IN_HOUR;
        }

        updateEvent(event.id, updates);
    };

    const handleRemoveTime = () => {
        if (isReadOnlyCalendar) return;
        const updates: Partial<AppEvent> = { isAllDay: true };
        if (event.type !== "plan") updates.type = "info";
        updateEvent(event.id, updates);
    };

    const currentStart = localTime ? localTime.start : Number(event.start);
    const currentEnd = localTime ? localTime.end : Number(event.end);

    const handleTimeBlur = () => {
        if (localTime) {
            const { start } = localTime;
            let { end } = localTime;
            if (end < start) {
                end = start;
            }
            updateEvent(event.id, { start, end });
            setLocalTime(undefined);
        }
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
                                value={minToTime(currentStart)}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => {
                                    const newStart = timeToMin(e.target.value);
                                    const prevDuration = currentEnd - currentStart;
                                    setLocalTime({ start: newStart, end: newStart + prevDuration });
                                }}
                                onBlur={handleTimeBlur}
                                onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
                            />
                        </div>
                        <div className="dtg-arrow dtg-time-arrow">
                            <Icon name="arrow_forward" size={18} />
                        </div>
                        <div className="dtg-field dtg-time-end">
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={minToTime(currentEnd)}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => setLocalTime({ start: currentStart, end: timeToMin(e.target.value) })}
                                onBlur={handleTimeBlur}
                                onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
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
                    !hasTime && (
                        <div className="dtg-inline-actions">
                            <button className="dtg-btn-icon" onClick={handleAddTime} disabled={isReadOnlyCalendar} title="Add time">
                                <Icon name="more_time" size={18} />
                            </button>
                            <button className="dtg-btn-icon" onClick={handleAddEndDate} disabled={isReadOnlyCalendar} title="Add end date">
                                <Icon name="transition_push" size={18} />
                            </button>
                        </div>
                    )
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
