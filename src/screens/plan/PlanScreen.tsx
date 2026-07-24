import React from "react";
import {
    TODAY,
    } from "../../core/store/data";
import {
    DayTimeline,
    } from "../../components/day-timeline";

import { InspectorPane } from "../../components/inspector-pane";
import type { AppTask, AppEvent } from "../../core/domain/models";

import { DragGhost } from "./drag-helpers";
import { usePlanActions } from "./use-plan-actions";
import { useDragAndDrop } from "./use-drag-and-drop";
import { DateGrid } from "./date-grid";
import { TitleBar } from "../../components/shell";
import { useTasks, useEvents, useSettings, useTaskQuery, useTaskFilters, useTaskSort, useCalFilters, useCalSort, useTimeFilters, useTimeSort } from "../../core/store/hooks";

import { TaskListPane } from "../../components/tasklist";



import { SplitPane } from "../../components/split-pane";
import { FilterSortButtons } from "./shared-menus";
import { expandEventsForView } from "../../core/domain/rrule-utils";

export function PlanScreen() {

    // Data state (persisted)
    const [tasks, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
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


    // Inspector state
    const [inspectorState, setInspectorState] = React.useState<{ type: string, id: string } | null>(null); // { type: 'task', id } or { type: 'event', id }



    const { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent } = usePlanActions(timelineDate, setInspectorState);
    const { onTaskDragStart, onEventDragStart, dragState, setDragState } = useDragAndDrop(timelineDate, setInspectorState, createEvent);

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
                    ghostStyle="bracket"
                />
            )}


        </div>
    );
}

