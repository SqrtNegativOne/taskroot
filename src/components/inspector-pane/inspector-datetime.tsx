import React from "react";
import type { AppEvent } from "../../core/domain/models";
import { isYmdString } from "../../core/domain/models";
import { isEventAllDay } from "../../core/domain/events";
import { Icon } from "../icon";
import { addDays, extractDateFromISO, extractTimeFromISO, extractHourMinuteFromISO } from "../../core/utils/date-utils";
import { ymd } from "../../core/store/data";
import { ICON_TIME_SEPARATOR, ICON_REMOVE, ICON_ADD_TIME, ICON_ADD_END_DATE } from "../../core/utils/icons";

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
        
        let newEndTime = undefined;
        if (newDate > endDateStr) {
            if (isAllDay) {
                const dt = new Date(`${newDate}T00:00:00`);
                dt.setDate(dt.getDate() + 1);
                newEndTime = ymd(dt);
            } else {
                newEndTime = `${newDate}T${extractTimeFromISO(currentEndTime)}`;
            }
        }
        
        const updates: Partial<AppEvent> = { 
            startTime: isAllDay ? newDate : `${newDate}T${extractTimeFromISO(currentStartTime)}`,
            ...(newEndTime !== undefined && { endTime: newEndTime })
        };
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
                    <TimeSection 
                        startTimeStr={startTimeStr}
                        endTimeStr={endTimeStr}
                        startDateStr={startDateStr}
                        currentEndTime={currentEndTime}
                        currentStartTime={currentStartTime}
                        isReadOnlyCalendar={isReadOnlyCalendar}
                        setLocalTime={setLocalTime}
                        handleTimeBlur={handleTimeBlur}
                        handleRemoveTime={handleRemoveTime}
                    />
                )}

                <div className="dtg-field dtg-date-start">
                    <input type="date" className="inspector-date-input" value={startDateStr} disabled={isReadOnlyCalendar} onChange={(e) => onStartDateChange(e.target.value)} />
                </div>

                {hasEndDate ? (
                    <EndDateSection 
                        endDateStr={endDateStr}
                        startDateStr={startDateStr}
                        isReadOnlyCalendar={isReadOnlyCalendar}
                        onEndDateChange={onEndDateChange}
                        handleRemoveEndDate={handleRemoveEndDate}
                    />
                ) : (
                    <AddActions 
                        isReadOnlyCalendar={isReadOnlyCalendar}
                        handleAddTime={handleAddTime}
                        setShowEndDate={setShowEndDate}
                        hasTime={hasTime}
                    />
                )}
            </div>
        </div>
    );
}

function TimeSection({
    startTimeStr,
    endTimeStr,
    startDateStr,
    currentEndTime,
    currentStartTime,
    isReadOnlyCalendar,
    setLocalTime,
    handleTimeBlur,
    handleRemoveTime,
}: {
    startTimeStr: string,
    endTimeStr: string,
    startDateStr: string,
    currentEndTime: string,
    currentStartTime: string,
    isReadOnlyCalendar: boolean,
    setLocalTime: React.Dispatch<React.SetStateAction<{ startTime: string, endTime: string } | undefined>>,
    handleTimeBlur: () => void,
    handleRemoveTime: () => void,
}) {
    return (
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
            <div className="dtg-arrow dtg-time-arrow"><Icon name={ICON_TIME_SEPARATOR} size={18} /></div>
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
                <button className="dtg-btn-icon" onClick={handleRemoveTime} disabled={isReadOnlyCalendar} title="Remove time"><Icon name={ICON_REMOVE} size={16} /></button>
            </div>
        </>
    );
}

function EndDateSection({
    endDateStr,
    startDateStr,
    isReadOnlyCalendar,
    onEndDateChange,
    handleRemoveEndDate,
}: {
    endDateStr: string,
    startDateStr: string,
    isReadOnlyCalendar: boolean,
    onEndDateChange: (newEndStr: string) => void,
    handleRemoveEndDate: () => void,
}) {
    return (
        <>
            <div className="dtg-arrow dtg-date-arrow"><Icon name={ICON_TIME_SEPARATOR} size={18} /></div>
            <div className="dtg-field dtg-date-end">
                <input type="date" className="inspector-date-input" value={endDateStr} min={startDateStr} disabled={isReadOnlyCalendar} onChange={(e) => onEndDateChange(e.target.value)} />
            </div>
            <div className="dtg-action dtg-date-action">
                <button className="dtg-btn-icon" onClick={handleRemoveEndDate} disabled={isReadOnlyCalendar} title="Remove end date"><Icon name={ICON_REMOVE} size={16} /></button>
            </div>
        </>
    );
}

function AddActions({
    isReadOnlyCalendar,
    handleAddTime,
    setShowEndDate,
    hasTime,
}: {
    isReadOnlyCalendar: boolean,
    handleAddTime: () => void,
    setShowEndDate: (show: boolean) => void,
    hasTime: boolean,
}) {
    if (!hasTime) {
        return (
            <div className="dtg-inline-actions">
                <button className="dtg-btn-icon" onClick={handleAddTime} disabled={isReadOnlyCalendar} title="Add time"><Icon name={ICON_ADD_TIME} size={18} /></button>
                <button className="dtg-btn-icon" onClick={() => !isReadOnlyCalendar && setShowEndDate(true)} disabled={isReadOnlyCalendar} title="Add end date"><Icon name={ICON_ADD_END_DATE} size={18} /></button>
            </div>
        );
    }
    return (
        <div className="dtg-bottom-actions">
            <button className="dtg-btn-icon" onClick={() => !isReadOnlyCalendar && setShowEndDate(true)} disabled={isReadOnlyCalendar} title="Add end date"><Icon name={ICON_ADD_END_DATE} size={18} /></button>
        </div>
    );
}

