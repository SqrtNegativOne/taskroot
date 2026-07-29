import React from "react";
import {
    TODAY,
    } from "../../core/store/data";
import {
    DayTimeline,
    } from "../../components/day-timeline";

import { InspectorPane } from "../../components/inspector-pane";
import type { AppEvent } from "../../core/domain/models";

import { DragGhost, type PlanDragState } from "./drag-helpers";
import { usePlanActions } from "./use-plan-actions";
import { useDragAndDrop } from "./use-drag-and-drop";
import { DateGrid } from "./date-grid";

import { useTasks, useEvents, useSettings, useTaskQuery, useTaskFilters, useTaskSort, useCalFilters, useCalSort, useTimeFilters, useTimeSort } from "../../core/store/hooks";

import { TaskListPane } from "../../components/tasklist";



import { SplitPane } from "../../components/split-pane";
import { FilterSortButtons } from "./shared-menus/index";
import { usePlanEvents, PLAN_EVENT_FILTER_COLUMNS, PLAN_EVENT_SORT_OPTIONS } from "./use-plan-events";
import { useCleanupDrafts } from "./use-cleanup-drafts";

export function PlanScreen() {

    // Data state (persisted)
    const [tasks, setTasks] = useTasks();
    const [events, setEvents] = useEvents();
    // Clean up empty items
    useCleanupDrafts(tasks, setTasks, setEvents);

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

    const { hydratedEvents, getEventFilterValues } = usePlanEvents(tasks, events, anchor);


    // Inspector state
    const [inspectorState, setInspectorState] = React.useState<{ type: string, id: string } | null>(null); // { type: 'task', id } or { type: 'event', id }



    const { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask } = usePlanActions(timelineDate, setInspectorState);
    const { onTaskDragStart, onEventDragStart, dragState, setDragState } = useDragAndDrop(timelineDate, setInspectorState, createEvent);

    return (
        <>

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
                        filters={filters}
                        setFilters={setFilters}
                        sort={sort}
                        setSort={setSort}
                        query={query}
                        setQuery={setQuery}
                        onDragStart={onTaskDragStart}
                        activeDragId={dragState?.task?.id}
                        onAddTask={onAddTask}
                        onDeleteTask={onDeleteTask}
                    />
                    <div className="right-pane">
                        <SplitPane
                            direction="vertical"
                            defaultSize={450}
                            minSize={150}
                            snapThreshold={60}
                        >
                            <DateGrid
                                view={view}
                                setView={(v) => setView(v as "month" | "week")}
                                anchor={anchor}
                                setAnchor={setAnchor}
                                events={hydratedEvents}
                                filter={calFilter}
                                sort={calSort}
                                filterMenu={
                                    <FilterSortButtons
                                        filters={calFilter}
                                        setFilters={setCalFilter}
                                        sort={calSort}
                                        setSort={setCalSort}
                                        columns={PLAN_EVENT_FILTER_COLUMNS}
                                        getValuesForColumn={getEventFilterValues}
                                        sortOptions={PLAN_EVENT_SORT_OPTIONS}
                                        align="right"
                                    />
                                }
                                today={TODAY}
                                dragState={dragState as any}
                                onEventDragStart={onEventDragStart as any}
                                onAddEvent={onAddEvent}
                            />
                            <DayTimeline<PlanDragState>
                                events={hydratedEvents}
                                filter={timeFilter}
                                sort={timeSort}
                                filterMenu={
                                    <FilterSortButtons
                                        filters={timeFilter}
                                        setFilters={setTimeFilter}
                                        sort={timeSort}
                                        setSort={setTimeSort}
                                        columns={PLAN_EVENT_FILTER_COLUMNS}
                                        getValuesForColumn={getEventFilterValues}
                                        sortOptions={PLAN_EVENT_SORT_OPTIONS}
                                        align="right"
                                    />
                                }
                                today={TODAY}
                                timelineDate={timelineDate}
                                setTimelineDate={setTimelineDate}
                                dragState={dragState as any}
                                setDragState={setDragState}
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


        </>
    );
}

