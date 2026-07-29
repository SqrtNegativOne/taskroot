import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React from 'react';
import { useTasks, useEvents, useSettings, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";

export const MAX_DISPLAY_ITEMS = 6;
export const ID_LENGTH = 9;
const ID_RADIX = 36;
const ID_SUBSTR_START = 2;
const ID_SUBSTR_END = 8;

const generateEventId = () => `e${Date.now()}-${Math.random().toString(ID_RADIX).slice(ID_SUBSTR_START, ID_SUBSTR_END)}`;

const createDefaultTask = (defaults: Partial<AppTask>, defaultDuration: number): AppTask => ({
    id: `t${Date.now()}`, title: "", status: "todo", priority: 1, tags: [], subtasks: [],
    est: defaultDuration || 0, added: new Date().toISOString(), isDraft: true, ...defaults
});

const createDefaultEvent = (date: Date, start: number, end: number, isAllDay: boolean): AppEvent => ({
    id: generateEventId(), title: "", date: ymd(date), endDate: ymd(date), start, end, type: isAllDay ? "info" : "busy", isAllDay, isDraft: true
});

export const canEditEvent = (ev: AppEvent | undefined, calendars: readonly {id: string, accessRole?: string}[]) => {
    if (!ev) return true;
    const cal = calendars.find(c => c.id === (ev.googleCalendarId || "primary"));
    return !cal || (cal.accessRole !== "reader" && cal.accessRole !== "freeBusyReader");
};

export function usePlanActions(
    timelineDate: Date, 
    setInspectorState: React.Dispatch<React.SetStateAction<{ type: string, id: string } | undefined>>
) {
    const [, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    const [settings] = useSettings();
    const [calendars] = useCalendars();

    const createEvent = (task: AppTask, overrides: Partial<AppEvent>) => {
        setEvents(prev => [...prev, {
            id: generateEventId(), taskId: task.id, date: ymd(timelineDate), endDate: ymd(timelineDate),
            start: 0, end: MINUTES_IN_HOUR, type: "plan", isAllDay: false, title: task.title, ...overrides
        }]);
    };

    const onAddTask = (defaults: Partial<AppTask> = {}) => {
        const newTask = createDefaultTask(defaults, settings.defaultTaskDuration || 0);
        setTasks(ts => [newTask, ...ts]);
        setInspectorState({ type: "task", id: newTask.id });
    };

    const onAddEvent = (dateArg: Date | string, startArg?: number, endArg?: number) => {
        const start = typeof startArg === "number" ? startArg : ID_LENGTH * MINUTES_IN_HOUR;
        const newEvent = createDefaultEvent(dateArg instanceof Date ? dateArg : timelineDate, start, typeof endArg === "number" ? endArg : start + MINUTES_IN_HOUR, typeof startArg !== "number");
        setEvents(es => [...es, newEvent]);
        setInspectorState({ type: "event", id: newEvent.id });
    };

    const onResizeEvent = (id: string, start: number, end: number) => {
        if (!canEditEvent(events.find((e: AppEvent) => e.id === id), calendars)) return;
        setEvents(prev => prev.map((e: AppEvent) => (e.id === id ? { ...e, start, end } : e)));
    };

    const onMoveEvent = onResizeEvent;

    const onDeleteTask = (id: string) => {
        setTasks(ts => ts.filter((t: AppTask) => t.id !== id));
        setEvents(es => es.filter((e: AppEvent) => e.taskId !== id));
    };

    return { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask };
}
