import React from "react";
import type { AppEvent } from "../../core/domain/models";
import { isYmdString } from "../../core/domain/models";
import { isEventAllDay } from "../../core/domain/events";
import { Icon } from "../icon";
import { addDays, extractDateFromISO, extractTimeFromISO, extractHourMinuteFromISO } from "../../core/utils/date-utils";
import { ymd } from "../../core/store/data";
import { ICON_ARROW_FORWARD, ICON_CLOSE, ICON_MORE_TIME, ICON_TRANSITION_PUSH } from "../../core/utils/icons";

const DEFAULT_START_HOUR = "09:00:00";
const DEFAULT_END_HOUR = "10:00:00";

function getDisplayEndDate(endTime: string, isAllDay: boolean): string {
    if (!isAllDay) return extractDateFromISO(endTime);
    const d = new Date(endTime + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return ymd(d);
}

export function DateTimeGrid({ event, updateEvent, isReadOnlyCalendar }: { event: AppEvent, updateEvent: (id: string, updates: Partial<AppEvent>) => void, isReadOnlyCalendar: boolean }) {
    const isAllDay = isEventAllDay(event);
    const startDay = extractDateFromISO(event.startTime);
    const endDay = getDisplayEndDate(event.endTime, isAllDay);
    
    const [showEndDate, setShowEndDate] = React.useState(startDay !== endDay);
    const [localTime, setLocalTime] = React.useState<{ startTime: string, endTime: string } | undefined>(undefined);

    React.useEffect(() => setShowEndDate(startDay !== endDay), [startDay, endDay]);
    React.useEffect(() => setLocalTime(undefined), [event.startTime, event.endTime]);

    const hasTime = !isAllDay;
    const hasEndDate = showEndDate;
    const currentStartTime = localTime?.startTime || event.startTime;
    const currentEndTime = localTime?.endTime || event.endTime;

    const startDateStr = extractDateFromISO(currentStartTime);
    const startTimeStr = hasTime ? extractHourMinuteFromISO(currentStartTime) : DEFAULT_START_HOUR;
    const endDateStr = getDisplayEndDate(currentEndTime, isAllDay);
    const endTimeStr = hasTime ? extractHourMinuteFromISO(currentEndTime) : DEFAULT_END_HOUR;

    const handleTimeBlur = () => {
        if (localTime) {
            updateEvent(event.id, { startTime: localTime.startTime, endTime: localTime.endTime });
            setLocalTime(undefined);
        }
    };

    const handleRemoveEndDate = () => {
        if (isReadOnlyCalendar) return;
        setShowEndDate(false);
        if (isAllDay) {
            const nextDay = addDays(new Date(startDay + "T00:00:00"), 1);
            updateEvent(event.id, { endTime: ymd(nextDay) });
        } else {
            updateEvent(event.id, { endTime: `${startDay}T${extractTimeFromISO(event.endTime)}` });
        }
    };

    const handleAddTime = () => {
        if (isReadOnlyCalendar) return;
        updateEvent(event.id, { 
            startTime: `${startDay}T${DEFAULT_START_HOUR}`,
            endTime: `${endDay}T${DEFAULT_END_HOUR}`
        });
    };

    const handleRemoveTime = () => {
        if (isReadOnlyCalendar) return;
        let eDay = endDay;
        if (startDay === eDay) eDay = ymd(addDays(new Date(startDay + "T00:00:00"), 1));
        updateEvent(event.id, { 
            startTime: startDay,
            endTime: eDay
        });
    };

    const onStartDateChange = (newDate: string) => {
        if (!isYmdString(newDate)) return;
        const updates: Partial<AppEvent> = { startTime: isAllDay ? newDate : `${newDate}T${extractTimeFromISO(currentStartTime)}` };
        if (newDate > endDateStr) {
            if (isAllDay) {
                const dt = new Date(`${newDate}T00:00:00`);
                dt.setDate(dt.getDate() + 1);
                updates.endTime = ymd(dt);
            } else {
                updates.endTime = `${newDate}T${extractTimeFromISO(currentEndTime)}`;
            }
        }
        updateEvent(event.id, updates);
    };

    const onEndDateChange = (newEndStr: string) => {
        if (!isYmdString(newEndStr)) return;
        if (isAllDay) {
            const dt = new Date(`${newEndStr}T00:00:00`);
            dt.setDate(dt.getDate() + 1);
            updateEvent(event.id, { endTime: ymd(dt) });
        } else {
            updateEvent(event.id, { endTime: `${newEndStr}T${extractTimeFromISO(currentEndTime)}` });
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
                                value={startTimeStr}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => setLocalTime({ startTime: `${startDateStr}T${e.target.value}:00`, endTime: currentEndTime })}
                                onBlur={handleTimeBlur}
                                onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
                            />
                        </div>
                        <div className="dtg-arrow dtg-time-arrow"><Icon name={ICON_ARROW_FORWARD} size={18} /></div>
                        <div className="dtg-field dtg-time-end">
                            <input
                                type="time"
                                className="inspector-date-input"
                                value={endTimeStr}
                                disabled={isReadOnlyCalendar}
                                onChange={(e) => setLocalTime({ startTime: currentStartTime, endTime: `${extractDateFromISO(currentEndTime)}T${e.target.value}:00` })}
                                onBlur={handleTimeBlur}
                                onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
                            />
                        </div>
                        <div className="dtg-action dtg-time-action">
                            <button className="dtg-btn-icon" onClick={handleRemoveTime} disabled={isReadOnlyCalendar} title="Remove time"><Icon name={ICON_CLOSE} size={16} /></button>
                        </div>
                    </>
                )}

                <div className="dtg-field dtg-date-start">
                    <input type="date" className="inspector-date-input" value={startDateStr} disabled={isReadOnlyCalendar} onChange={(e) => onStartDateChange(e.target.value)} />
                </div>

                {hasEndDate ? (
                    <>
                        <div className="dtg-arrow dtg-date-arrow"><Icon name={ICON_ARROW_FORWARD} size={18} /></div>
                        <div className="dtg-field dtg-date-end">
                            <input type="date" className="inspector-date-input" value={endDateStr} min={startDateStr} disabled={isReadOnlyCalendar} onChange={(e) => onEndDateChange(e.target.value)} />
                        </div>
                        <div className="dtg-action dtg-date-action">
                            <button className="dtg-btn-icon" onClick={handleRemoveEndDate} disabled={isReadOnlyCalendar} title="Remove end date"><Icon name={ICON_CLOSE} size={16} /></button>
                        </div>
                    </>
                ) : (!hasTime && (
                    <div className="dtg-inline-actions">
                        <button className="dtg-btn-icon" onClick={handleAddTime} disabled={isReadOnlyCalendar} title="Add time"><Icon name={ICON_MORE_TIME} size={18} /></button>
                        <button className="dtg-btn-icon" onClick={() => !isReadOnlyCalendar && setShowEndDate(true)} disabled={isReadOnlyCalendar} title="Add end date"><Icon name={ICON_TRANSITION_PUSH} size={18} /></button>
                    </div>
                ))}
                
                {hasTime && !hasEndDate && (
                    <div className="dtg-bottom-actions">
                        <button className="dtg-btn-icon" onClick={() => !isReadOnlyCalendar && setShowEndDate(true)} disabled={isReadOnlyCalendar} title="Add end date"><Icon name={ICON_TRANSITION_PUSH} size={18} /></button>
                    </div>
                )}
            </div>
        </div>
    );
}
