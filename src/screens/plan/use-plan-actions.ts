import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React from 'react';
import { useTasks, useEvents, useSettings, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";
import type { InspectorState } from "../../components/inspector-pane";
import { addDays, MS_IN_MINUTE, toFloatingIso } from "../../core/utils/date-utils";

export const MAX_DISPLAY_ITEMS = 6;
export const ID_LENGTH = 9;
const ID_RADIX = 36;
const ID_SUBSTR_START = 2;
const ID_SUBSTR_END = 8;

const generateEventId = () => `e${Date.now()}-${Math.random().toString(ID_RADIX).slice(ID_SUBSTR_START, ID_SUBSTR_END)}`;

const createDefaultTask = (defaults: Partial<AppTask>, defaultDuration: number): AppTask => ({
    id: `t${Date.now()}`, title: "", status: "todo", priority: 1, tags: [], subtasks: [],
    est: defaultDuration || 0, added: new Date().toISOString(), ...defaults
});

const createDefaultEvent = (date: Date, startMins: number, endMins: number, isAllDay: boolean): AppEvent => {
    const dStr = ymd(date);
    const dt = new Date(`${dStr}T00:00:00`);
    const toIso = (mins: number) => {
        const t = new Date(dt.getTime() + mins * MS_IN_MINUTE);
        return toFloatingIso(t);
    };
    if (isAllDay) {
        return {
            id: generateEventId(), title: "", type: "info", isAllDay: true,
            startTime: `${dStr}T00:00:00`,
            endTime: `${ymd(addDays(dt))}T00:00:00`
        };
    }
    return {
        id: generateEventId(), title: "", type: "busy", isAllDay: false,
        startTime: toIso(startMins), endTime: toIso(endMins)
    };
};

export const canEditEvent = (ev: AppEvent | undefined, calendars: readonly {id: string, accessRole?: string}[]) => {
    if (!ev) return true;
    const cal = calendars.find(c => c.id === (ev.googleCalendarId || "primary"));
    return !cal || cal.accessRole === "owner" || cal.accessRole === "writer";
};

export function usePlanActions(
    timelineDate: Date, 
    setInspectorState: React.Dispatch<React.SetStateAction<InspectorState | undefined>>
) {
    const [, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    const [settings] = useSettings();
    const [calendars] = useCalendars();

    const createEvent = (task: AppTask, overrides: Partial<AppEvent>) => {
        const defaultCal = calendars.find(c => c.primary)?.id || "primary";
        const calData = calendars.find(c => c.id === defaultCal);
        const dStr = ymd(timelineDate);
        setEvents(prev => [...prev, {
            id: generateEventId(), taskId: task.id, type: "plan", isAllDay: false, title: task.title,
            startTime: `${dStr}T00:00:00`, endTime: `${dStr}T01:00:00`,
            googleCalendarId: defaultCal, category: calData?.summary || "", ...overrides
        }]);
    };

    const onAddTask = (defaults: Partial<AppTask> = {}) => {
        const newTask = createDefaultTask(defaults, settings.defaultTaskDuration || 0);
        setInspectorState({ type: "new_task", draft: newTask });
    };

    const onAddEvent = (dateArg: Date | string, startArg?: number, endArg?: number) => {
        const start = typeof startArg === "number" ? startArg : ID_LENGTH * MINUTES_IN_HOUR;
        const newEvent = createDefaultEvent(dateArg instanceof Date ? dateArg : timelineDate, start, typeof endArg === "number" ? endArg : start + MINUTES_IN_HOUR, typeof startArg !== "number");
        const defaultCal = calendars.find(c => c.primary)?.id || "primary";
        const calData = calendars.find(c => c.id === defaultCal);
        newEvent.googleCalendarId = defaultCal;
        if (calData) newEvent.category = calData.summary;
        setInspectorState({ type: "new_event", draft: newEvent });
    };

    const onResizeEvent = (id: string, startTime: string, endTime: string) => {
        if (!canEditEvent(events.find((e: AppEvent) => e.id === id), calendars)) return;
        setEvents(prev => prev.map((e: AppEvent) => (e.id === id ? { ...e, startTime, endTime } : e)));
    };

    const onMoveEvent = onResizeEvent;

    const onDeleteTask = (id: string) => {
        setTasks(ts => ts.filter((t: AppTask) => t.id !== id));
        setEvents(es => es.filter((e: AppEvent) => e.taskId !== id));
    };

    return { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask };
}
