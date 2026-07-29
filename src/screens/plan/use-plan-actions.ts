import { BASE_36, MINUTES_IN_HOUR, HOURS_PER_DAY } from "../../core/utils/constants";
import React from 'react';
import { useTasks, useEvents, useSettings, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";

export const MAX_DISPLAY_ITEMS = 6;
export const ID_LENGTH = 9;


export function usePlanActions(
    timelineDate: Date, 
    setInspectorState: React.Dispatch<React.SetStateAction<{ type: string, id: string } | null>>
) {
    const [, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    const [settings] = useSettings();
    const [calendars] = useCalendars();

    const createEvent = (task: AppTask, date: import("../../core/domain/models").DateString, start: number, duration: number, isAllDay = false) => {
        const id = `e${Date.now()}-${Math.random().toString(BASE_36).slice(2, MAX_DISPLAY_ITEMS)}`;
        const newEvent = {
            id,
            taskId: task.id,
            date,
            endDate: date,
            start,
            end: Math.min(HOURS_PER_DAY * MINUTES_IN_HOUR, start + duration),
            type: "plan",
            isAllDay,
            title: task.title,
        };
        setEvents((prev: AppEvent[]) => [...prev, newEvent]);
    };

    const onAddTask = (defaults: Partial<AppTask> = {}) => {
        const id = `t${Date.now()}`;
        setTasks((ts: AppTask[]) => [
            {
                id,
                title: "",
                status: "todo",
                priority: 1,
                tags: [],
                subtasks: [],
                parent_task: null,
                dependency: null,
                est:
                    settings.defaultTaskDuration === 0 ||
                    settings.defaultTaskDuration === undefined
                        ? 0
                        : settings.defaultTaskDuration,
                added: new Date().toISOString(),
                isDraft: true,
                ...defaults,
            },
            ...ts,
        ]);
        setInspectorState({ type: "task", id });
    };

    const onAddEvent = (dateArg: Date | string, startArg?: number, endArg?: number) => {
        const d = dateArg instanceof Date ? dateArg : timelineDate;
        const isAllDay = typeof startArg !== "number";
        const start = typeof startArg === "number" ? startArg : ID_LENGTH * MINUTES_IN_HOUR;
        const end = typeof endArg === "number" ? endArg : start + MINUTES_IN_HOUR;
        const id = `e${Date.now()}-${Math.random().toString(BASE_36).slice(2, MAX_DISPLAY_ITEMS)}`;
        setEvents((es: AppEvent[]) => [
            ...es,
            {
                id,
                title: "",
                date: ymd(d),
                endDate: ymd(d),
                start,
                end,
                type: isAllDay ? "info" : "busy",
                isAllDay,
                isDraft: true,
            },
        ]);
        setInspectorState({ type: "event", id });
    };

    const onResizeEvent = (id: string, start: number, end: number) => {
        const ev = events.find((e: AppEvent) => e.id === id);
        if (ev) {
            const calId = ev.googleCalendarId || "primary";
            const cal = calendars.find((c: { id: string; accessRole?: string }) => c.id === calId);
            if (cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader")) return;
        }
        setEvents((prev: AppEvent[]) =>
            prev.map((e: AppEvent) => (e.id === id ? { ...e, start, end } : e)),
        );
    };

    const onMoveEvent = (id: string, start: number, end: number) => {
        const ev = events.find((e: AppEvent) => e.id === id);
        if (ev) {
            const calId = ev.googleCalendarId || "primary";
            const cal = calendars.find((c: { id: string; accessRole?: string }) => c.id === calId);
            if (cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader")) return;
        }
        setEvents((prev: AppEvent[]) =>
            prev.map((e: AppEvent) => (e.id === id ? { ...e, start, end } : e)),
        );
    };

    const onDeleteTask = (id: string) => {
        setTasks((ts: AppTask[]) => ts.filter((t: AppTask) => t.id !== id));
        setEvents((es: AppEvent[]) =>
            es.filter((e: AppEvent) => e.taskId !== id),
        );
    };

    return { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask };
}
