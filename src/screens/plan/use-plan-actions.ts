import React from 'react';
import { useTasks, useEvents, useSettings, useCalendars } from "../../core/store/hooks";
import type { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";

export function usePlanActions(
    timelineDate: Date, 
    setInspectorState: React.Dispatch<React.SetStateAction<{ type: string, id: string } | null>>
) {
    const [, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    const [settings] = useSettings();
    const [calendars] = useCalendars();

    const createEvent = (task: AppTask, date: string, start: number, duration: number, isAllDay = false) => {
        const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newEvent = {
            id,
            taskId: task.id,
            date,
            endDate: date,
            start,
            end: Math.min(24 * 60, start + duration),
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
        const start = typeof startArg === "number" ? startArg : 9 * 60;
        const end = typeof endArg === "number" ? endArg : start + 60;
        const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
            const cal = calendars.find((c: any) => c.id === calId) as any;
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
            const cal = calendars.find((c: any) => c.id === calId) as any;
            if (cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader")) return;
        }
        setEvents((prev: AppEvent[]) =>
            prev.map((e: AppEvent) => (e.id === id ? { ...e, start, end } : e)),
        );
    };

    return { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent };
}
