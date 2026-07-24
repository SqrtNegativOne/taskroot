import React from "react";
import {
    TODAY,
    ymd,
    durationLabel,
} from "../../core/store/data";
import {
    DayTimeline,
    PX_PER_MIN,
    SNAP_MIN,
} from "../../components/day-timeline";

import { InspectorPane } from "../../components/inspector-pane";
import type { AppTask, AppEvent } from "../../core/domain/models";

interface PlanDragTarget {
    kind: string;
    minute?: number;
    duration?: number;
    date?: string;
}

interface PlanDragState {
    task?: AppTask | null;
    event?: AppEvent | null;
    pointerX: number;
    pointerY: number;
    target: PlanDragTarget | null;
}
import { DateGrid } from "./date-grid";
import { TitleBar } from "../../components/shell";
import { useTasks, useEvents, useSettings, useTaskQuery, useTaskFilters, useTaskSort, useCalFilters, useCalSort, useTimeFilters, useTimeSort, useCalendars } from "../../core/store/hooks";

import { TaskListPane } from "../../components/tasklist";


import {
    useTweaks,
    TweaksPanel,
    TweakSection,
    TweakSlider,
    TweakToggle,
    TweakRadio,
    TweakColor,
} from "./tweaks-panel";
import { SplitPane } from "../../components/split-pane";
import { FilterSortButtons } from "./shared-menus";
import { expandEventsForView } from "../../core/domain/rrule-utils";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    accent: "var(--tag-yellow)",
    fontScale: 1,
    showSubtaskCounts: true,
    weekStart: "month",
    ghostStyle: "bracket",
    showCurrentTime: true,
}; /*EDITMODE-END*/

export function PlanScreen() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

    // Data state (persisted)
    const [tasks, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    const [calendars] = useCalendars();

    // Clean up empty items
    React.useEffect(() => {
        const validTasks = tasks.filter(
            (t) => t.isDraft || (t.title && t.title.trim() !== ""),
        );
        if (validTasks.length !== tasks.length) {
            setTasks(validTasks);
            setEvents((es: AppEvent[]) =>
                es.filter((e: AppEvent) => {
                    if (e.taskId)
                        return validTasks.some((t: AppTask) => t.id === e.taskId);
                    return e.isDraft || (e.title && e.title.trim() !== "");
                }),
            );
        }
    }, [setTasks, setEvents, tasks]);

    // UI state — task list
    const [query, setQuery] = useTaskQuery();
    const [filters, setFilters] = useTaskFilters();
    const [sort, setSort] = useTaskSort();

    // UI state — calendar
    const [settings] = useSettings();
    const [view, setView] = React.useState<"month" | "week">(
        settings.defaultCalendarView || "month",
    );
    const [anchor, setAnchor] = React.useState(new Date(TODAY));
    const [timelineDate, setTimelineDate] = React.useState(new Date(TODAY));

    // Event filters
    const [calFilter, setCalFilter] = useCalFilters();
    const [calSort, setCalSort] = useCalSort();
    const [timeFilter, setTimeFilter] = useTimeFilters();
    const [timeSort, setTimeSort] = useTimeSort();

    const allEventTags = React.useMemo(() => {
        const s = new Set<string>();
        tasks.forEach((t: AppTask) => (t.tags || []).forEach((tag) => s.add(tag)));
        return Array.from(s).sort();
    }, [tasks]);

    const visibleEvents = React.useMemo(() => {
        const start = new Date(anchor);
        start.setMonth(start.getMonth() - 2);
        const end = new Date(anchor);
        end.setMonth(end.getMonth() + 2);
        return expandEventsForView(events as unknown as import("../../core/domain/events").AppEvent[], start, end);
    }, [events, anchor]);

    const getEventFilterValues = React.useCallback(
        (col: string) => {
            if (col === "type") return ["info", "plan", "busy", "log"];
            if (col === "tag") return allEventTags;
            if (col === "taskStatus") return ["todo", "done", "none"];
            if (col === "category") {
                const s = new Set<string>();
                events.forEach((e: AppEvent) => {
                    if (e.category) s.add(e.category);
                });
                return Array.from(s).sort();
            }
            return [];
        },
        [allEventTags, events],
    );

    // Drag state — { task, pointerX, pointerY, target }
    const [dragState, setDragState] = React.useState<PlanDragState | null>(null);
    const dragRef = React.useRef<PlanDragState | null>(null);
    dragRef.current = dragState;

    // Inspector state
    const [inspectorState, setInspectorState] = React.useState<{ type: string, id: string } | null>(null); // { type: 'task', id } or { type: 'event', id }

    // Apply accent dynamically
    React.useEffect(() => {
        document.documentElement.style.setProperty("--accent", t.accent);
        document.documentElement.style.setProperty("--font-scale", String(t.fontScale));
    }, [t.accent, t.fontScale]);

    const onTaskDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, task: AppTask) => {
        e.preventDefault();
        const start = { x: e.clientX, y: e.clientY };
        let active = false;

        const move = (ev: PointerEvent | MouseEvent) => {
            if (!active) {
                const dx = (ev as MouseEvent).clientX - start.x;
                const dy = (ev as MouseEvent).clientY - start.y;
                if (Math.hypot(dx, dy) < 5) return;
                active = true;
            }
            // Hit test for drop target
            const el = document.elementFromPoint((ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
            const target = resolveDropTarget(
                el,
                (ev as MouseEvent).clientX,
                (ev as MouseEvent).clientY,
                task,
                undefined,
            );
            setDragState({
                task,
                pointerX: (ev as MouseEvent).clientX,
                pointerY: (ev as MouseEvent).clientY,
                target,
            });
        };

        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                setInspectorState({ type: "task", id: task.id });
            } else {
                const ds = dragRef.current;
                if (ds && ds.target) {
                    if (ds.target.kind === "grid-day") {
                        createEvent(
                            task,
                            ds.target!.date!,
                            9 * 60,
                            task.est || 60,
                            true,
                        );
                    } else if (ds.target.kind === "day-time") {
                        createEvent(
                            task,
                            ymd(timelineDate),
                            ds.target!.minute!,
                            task.est || 60,
                            false,
                        );
                    }
                }
            }
            setDragState(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const onEventDragStart = (e: React.PointerEvent<Element> | React.MouseEvent<Element, MouseEvent>, _eventToMoveAny: unknown, task?: AppTask | null) => {
        const eventToMove = _eventToMoveAny as AppEvent;
        const calId = eventToMove.googleCalendarId || "primary";
        const cal = calendars.find((c: any) => c.id === calId) as any;
        if (cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader")) {
            // Do not allow dragging read-only events, but allow selecting them
            setInspectorState({ type: "event", id: eventToMove.id });
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        const start = { x: e.clientX, y: e.clientY };
        let active = false;

        const move = (ev: PointerEvent | MouseEvent) => {
            if (!active) {
                const dx = (ev as MouseEvent).clientX - start.x;
                const dy = (ev as MouseEvent).clientY - start.y;
                if (Math.hypot(dx, dy) < 5) return;
                active = true;
            }
            const el = document.elementFromPoint((ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
            const target = resolveDropTarget(
                el,
                (ev as MouseEvent).clientX,
                (ev as MouseEvent).clientY,
                task,
                eventToMove,
            );
            setDragState({
                event: eventToMove,
                task,
                pointerX: (ev as MouseEvent).clientX,
                pointerY: (ev as MouseEvent).clientY,
                target,
            });
        };

        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (!active) {
                setInspectorState({ type: "event", id: eventToMove.id });
            } else {
                const ds = dragRef.current;
                if (ds && ds.target) {
                    if (ds.target.kind === "grid-day") {
                        setEvents((prev) =>
                            prev.map((evnt) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ds.target!.date!,
                                          endDate: ds.target!.date!,
                                      }
                                    : evnt,
                            ),
                        );
                    } else if (ds.target.kind === "day-time") {
                        const duration = eventToMove.end - eventToMove.start;
                        setEvents((prev) =>
                            prev.map((evnt) =>
                                evnt.id === eventToMove.id
                                    ? {
                                          ...evnt,
                                          date: ymd(timelineDate),
                                          endDate: ymd(timelineDate),
                                          start: ds.target!.minute!,
                                          end: ds.target!.minute! + duration,
                                          isAllDay: false,
                                      }
                                    : evnt,
                            ),
                        );
                    }
                }
            }
            setDragState(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

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
        setEvents((prev) => [...prev, newEvent]);
    };

    const onAddTask = (defaults: Partial<import('../../core/domain/models').AppTask> = {}) => {
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
        setEvents((prev) =>
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
        setEvents((prev) =>
            prev.map((e: AppEvent) => (e.id === id ? { ...e, start, end } : e)),
        );
    };

    return (
        <div className="app">
            <TitleBar current="plan" />

            <main className="main" style={{ position: "relative" }}>
                <SplitPane
                    direction="horizontal"
                    defaultSize={360}
                    minSize={200}
                    snapThreshold={50}
                >
                    <TaskListPane
                        tasks={tasks}
                        setTasks={setTasks}
                        filters={filters as unknown as import("../../core/domain/models").AppFilter[]}
                        setFilters={setFilters as unknown as React.Dispatch<React.SetStateAction<import("../../core/domain/models").AppFilter[]>>}
                        sort={sort}
                        setSort={setSort}
                        query={query}
                        setQuery={setQuery}
                        onDragStart={onTaskDragStart}
                        activeDragId={dragState?.task?.id}
                        onAddTask={onAddTask}
                        onDeleteTask={(id) => {
                            setTasks((ts: AppTask[]) => ts.filter((t: AppTask) => t.id !== id));
                            setEvents((es: AppEvent[]) =>
                                es.filter((e: AppEvent) => e.taskId !== id),
                            );
                        }}
                    />
                    <div className="right-pane">
                        <SplitPane
                            direction="vertical"
                            defaultSize={450}
                            minSize={150}
                            snapThreshold={60}
                        >
                            <DateGrid
                                view={view as unknown as string}
                                setView={setView as unknown as (v: string) => void}
                                anchor={anchor}
                                setAnchor={setAnchor}
                                events={visibleEvents as unknown as import("../../core/domain/models").AppEvent[]}
                                tasks={tasks}
                                filter={calFilter as unknown as import("../../core/domain/models").AppFilter[]}
                                sort={calSort}
                                filterMenu={
                                    <FilterSortButtons
                                        filters={calFilter as unknown as import("./shared-menus").Filter[]}
                                        setFilters={setCalFilter as unknown as React.Dispatch<React.SetStateAction<import("./shared-menus").Filter[]>>}
                                        sort={calSort}
                                        setSort={setCalSort}
                                        columns={[
                                            { id: "type", label: "Type" },
                                            { id: "tag", label: "Tag" },
                                            {
                                                id: "taskStatus",
                                                label: "Task Status",
                                            },
                                            {
                                                id: "category",
                                                label: "Category",
                                            },
                                        ]}
                                        getValuesForColumn={
                                            getEventFilterValues
                                        }
                                        sortOptions={[
                                            { id: "time", label: "Time" },
                                            {
                                                id: "taskStatus",
                                                label: "Task Completed",
                                            },
                                        ]}
                                        align="right"
                                    />
                                }
                                today={TODAY}
                                dragState={dragState as unknown as any}
                                onEventDragStart={onEventDragStart}
                                onAddEvent={onAddEvent}
                                onDropToDate={() => {}}
                            />
                            <DayTimeline
                                events={visibleEvents as unknown as import("../../core/domain/events").AppEvent[]}
                                tasks={tasks}
                                filter={timeFilter as unknown as import("../../core/domain/models").AppFilter[]}
                                sort={timeSort}
                                filterMenu={
                                    <FilterSortButtons
                                        filters={timeFilter as unknown as import("./shared-menus").Filter[]}
                                        setFilters={setTimeFilter as unknown as React.Dispatch<React.SetStateAction<import("./shared-menus").Filter[]>>}
                                        sort={timeSort}
                                        setSort={setTimeSort}
                                        columns={[
                                            { id: "type", label: "Type" },
                                            { id: "tag", label: "Tag" },
                                            {
                                                id: "taskStatus",
                                                label: "Task Status",
                                            },
                                            {
                                                id: "category",
                                                label: "Category",
                                            },
                                        ]}
                                        getValuesForColumn={
                                            getEventFilterValues
                                        }
                                        sortOptions={[
                                            { id: "time", label: "Time" },
                                            {
                                                id: "taskStatus",
                                                label: "Task Completed",
                                            },
                                        ]}
                                        align="right"
                                    />
                                }
                                today={TODAY}
                                timelineDate={timelineDate}
                                setTimelineDate={setTimelineDate}
                                dragState={dragState as unknown as import("../../components/day-timeline").DragState}
                                setDragState={setDragState as unknown as React.Dispatch<React.SetStateAction<import("../../components/day-timeline").DragState | null>>}
                                onResizeEvent={onResizeEvent}
                                onMoveEvent={onMoveEvent}
                                onEventClick={(ev: AppEvent) =>
                                    setInspectorState({
                                        type: "event",
                                        id: ev.id,
                                    })
                                }
                                onAddEvent={onAddEvent}
                                onDropToTime={() => {}}
                            />
                        </SplitPane>
                    </div>
                </SplitPane>

                <InspectorPane
                    inspectorState={inspectorState}
                    onClose={() => setInspectorState(null)}
                    tasks={tasks}
                    setTasks={setTasks}
                    events={events}
                    setEvents={setEvents}
                />
            </main>

            {dragState && (dragState.task || dragState.event) && (
                <DragGhost
                    task={dragState.task}
                    event={dragState.event}
                    x={dragState.pointerX}
                    y={dragState.pointerY}
                    style={t.ghostStyle}
                />
            )}

            <TweaksPanel title="Tweaks">
                <TweakSection label="Theme" />
                <TweakColor
                    label="Accent"
                    value={t.accent}
                    options={[
                        "var(--tag-yellow)",
                        "var(--tag-gold)",
                        "#9eb39b",
                        "var(--tag-purple)",
                        "#d9866b",
                    ]}
                    onChange={(v: any) => setTweak("accent", v)}
                />
                <TweakSlider
                    label="Font scale"
                    value={t.fontScale}
                    min={0.85}
                    max={1.15}
                    step={0.05}
                    unit="×"
                    onChange={(v: any) => setTweak("fontScale", v)}
                />

                <TweakSection label="Calendar" />
                <TweakRadio
                    label="Default view"
                    value={t.weekStart}
                    options={[
                        {label: "month", value: "month"},
                        {label: "week", value: "week"},
                    ]}
                    onChange={(v: any) => {
                        setTweak("weekStart", v);
                        setView(v as "month" | "week");
                    }}
                />
                <TweakToggle
                    label="Show 'now' line"
                    value={t.showCurrentTime}
                    onChange={(v: any) => setTweak("showCurrentTime", v)}
                />

                <TweakSection label="Task list" />
                <TweakToggle
                    label="Subtask counts"
                    value={t.showSubtaskCounts}
                    onChange={(v: any) => setTweak("showSubtaskCounts", v)}
                />

                <TweakSection label="Drag" />
                <TweakRadio
                    label="Ghost style"
                    value={t.ghostStyle}
                    options={[
                        {label: "bracket", value: "bracket"},
                        {label: "solid", value: "solid"},
                    ]}
                    onChange={(v: any) => setTweak("ghostStyle", v)}
                />
            </TweaksPanel>
        </div>
    );
}

function DragGhost({ task, event, x, y, style }: { task?: AppTask | null, event?: AppEvent | null, x: number, y: number, style: string }) {
    const title = task ? task.title : event ? event.title : "";
    const pri = task ? task.priority : null;
    const est = task ? task.est : event ? event.end - event.start : 60;
    
    return (
        <div
            className={`drag-ghost is-${style}`}
            style={{ left: x + 14, top: y - 8 }}
        >
            <div className="drag-ghost-inner">
                {pri !== null && pri !== undefined && (
                    <div
                        className={`task-circle pri-bg-${pri}`}
                        aria-label={String(pri)}
                    />
                )}
                <span className="drag-ghost-title">{title}</span>
            </div>
            <div className="drag-ghost-meta">
                <span className="bracket">└</span> {durationLabel(est)} block
            </div>
        </div>
    );
}

function resolveDropTarget(el: Element | null, _x: number, y: number, task?: AppTask | null, event?: AppEvent | null): PlanDragTarget | null {
    if (!el) return null;
    // Day calendar grid
    const grid = el.closest('[data-drop-kind="day-time"]') as HTMLElement | null;
    if (grid) {
        const rect = grid.getBoundingClientRect();
        const offsetY = y - rect.top;
        const rawMin = offsetY / PX_PER_MIN;
        const snapped = Math.max(
            0,
            Math.min(
                24 * 60 - SNAP_MIN,
                Math.round(rawMin / SNAP_MIN) * SNAP_MIN,
            ),
        );
        return {
            kind: "day-time",
            minute: snapped,
            duration: task?.est || (event ? event.end - event.start : 60),
        };
    }
    // Date grid day cell
    const day = el.closest('[data-drop-kind="grid-day"]') as HTMLElement | null;
    if (day) {
        return { kind: "grid-day", date: day.dataset.dropDate };
    }
    return null;
}

