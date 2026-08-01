import React from "react";
import type { AppEvent } from "../../core/domain/models";
import { isDateString } from "../../core/domain/models";
import { Icon } from "../icon";

const DEFAULT_START_HOUR = "09:00:00";
const DEFAULT_END_HOUR = "10:00:00";

export function DateTimeGrid({ event, updateEvent, isReadOnlyCalendar, showEndDate, setShowEndDate }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean, showEndDate: boolean, setShowEndDate: (val: boolean) => void }) {
    const hasTime = !event.isAllDay;
    const hasEndDate = showEndDate;

    const [localTime, setLocalTime] = React.useState<{ startTime: string, endTime: string } | undefined>(undefined);

    React.useEffect(() => {
        setLocalTime(undefined);
    }, [event.startTime, event.endTime]);

    const handleAddEndDate = () => {
        if (isReadOnlyCalendar) return;
        setShowEndDate(true);
    };

    const handleRemoveEndDate = () => {
        if (isReadOnlyCalendar) return;
        setShowEndDate(false);
        const startDay = event.startTime.substring(0, 10);
        if (event.isAllDay) {
            const nextDay = new Date(new Date(startDay + "T00:00:00").getTime() + 24 * 3600 * 1000);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const endDay = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
            updateEvent(event.id, { endTime: `${endDay}T00:00:00` });
        } else {
            const endT = event.endTime.substring(11, 19);
            updateEvent(event.id, { endTime: `${startDay}T${endT}` });
        }
    };

    const handleAddTime = () => {
        if (isReadOnlyCalendar) return;
        const updates: Partial<AppEvent> = { isAllDay: false };
        if (event.type !== "plan") updates.type = "busy";
        
        const startDay = event.startTime.substring(0, 10);
        const endDay = event.endTime.substring(0, 10);
        
        updates.startTime = `${startDay}T${DEFAULT_START_HOUR}`;
        updates.endTime = `${endDay}T${DEFAULT_END_HOUR}`;

        updateEvent(event.id, updates);
    };

    const handleRemoveTime = () => {
        if (isReadOnlyCalendar) return;
        const updates: Partial<AppEvent> = { isAllDay: true };
        if (event.type !== "plan") updates.type = "info";
        
        const startDay = event.startTime.substring(0, 10);
        let endDay = event.endTime.substring(0, 10);
        
        if (startDay === endDay) {
            const nextDay = new Date(new Date(startDay + "T00:00:00").getTime() + 24 * 3600 * 1000);
            const pad = (n: number) => n.toString().padStart(2, '0');
            endDay = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
        }
        
        updates.startTime = `${startDay}T00:00:00`;
        updates.endTime = `${endDay}T00:00:00`;
        updateEvent(event.id, updates);
    };

    const currentStartTime = localTime ? localTime.startTime : event.startTime;
    const currentEndTime = localTime ? localTime.endTime : event.endTime;

    const handleTimeBlur = () => {
        if (localTime) {
            updateEvent(event.id, { startTime: localTime.startTime, endTime: localTime.endTime });
            setLocalTime(undefined);
        }
    };

    const startDateStr = currentStartTime.substring(0, 10);
    const startTimeStr = currentStartTime.substring(11, 16);
    
    // For all-day events, the endTime is exclusive (midnight the next day). 
    // In UI, we show the inclusive end date (1 day before the exclusive end).
    let endDateStr = currentEndTime.substring(0, 10);
    const endTimeStr = currentEndTime.substring(11, 16);
    
    if (event.isAllDay) {
        const d = new Date(currentEndTime);
        d.setDate(d.getDate() - 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        endDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    return (
        <div className="datetime-grid-container">
            <div className={`dtg-layout dtg-has-time-${hasTime} dtg-has-end-${hasEndDate}`}>
                {hasTime && (
                    <>
                        <div className="dtg-field dtg-time-start">
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={startTimeStr}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => {
                                    const newTime = e.target.value + ":00";
                                    setLocalTime({ startTime: `${startDateStr}T${newTime}`, endTime: currentEndTime });
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
                                value={endTimeStr}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => {
                                    const newTime = e.target.value + ":00";
                                    setLocalTime({ startTime: currentStartTime, endTime: `${currentEndTime.substring(0,10)}T${newTime}` });
                                }}
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
                        value={startDateStr}
                        disabled={isReadOnlyCalendar}
                        onChange={(e) => {
                            if (isDateString(e.target.value)) {
                                const newDate = e.target.value;
                                const updates: Partial<AppEvent> = { startTime: `${newDate}T${currentStartTime.substring(11)}` };
                                // if start is pushed past end, move end
                                if (newDate > endDateStr) {
                                    if (event.isAllDay) {
                                        const dt = new Date(`${newDate}T00:00:00`);
                                        dt.setDate(dt.getDate() + 1);
                                        const pad = (n: number) => n.toString().padStart(2, '0');
                                        updates.endTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T00:00:00`;
                                    } else {
                                        updates.endTime = `${newDate}T${currentEndTime.substring(11)}`;
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
                                value={endDateStr}
                                min={startDateStr}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => { 
                                    if (isDateString(e.target.value)) {
                                        let newEndStr = e.target.value;
                                        if (event.isAllDay) {
                                            const dt = new Date(`${newEndStr}T00:00:00`);
                                            dt.setDate(dt.getDate() + 1);
                                            const pad = (n: number) => n.toString().padStart(2, '0');
                                            updateEvent(event.id, { endTime: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T00:00:00` });
                                        } else {
                                            updateEvent(event.id, { endTime: `${newEndStr}T${currentEndTime.substring(11)}` });
                                        }
                                    }
                                }}
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
