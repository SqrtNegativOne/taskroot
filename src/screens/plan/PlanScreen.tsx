import React from "react";
import {
    TODAY,
    } from "../../core/store/data";
import {
    DayTimeline,
    } from "../../components/day-timeline";

import { InspectorPane, type InspectorState } from "../../components/inspector-pane";
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
import { RecurringActionModal } from "../../components/RecurringActionModal";
import type { RecurringMode } from "../../core/domain/rrule-utils";

export function PlanScreen() {

    // Data state (persisted)
    const [tasks, setTasks] = useTasks();
    const [events, setEvents] = useEvents();

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
    const [inspectorState, setInspectorState] = React.useState<InspectorState>();


    const [recurringPrompt, setRecurringPrompt] = React.useState<{
        actionType: "edit" | "delete";
        onConfirm: (mode: RecurringMode) => void;
    } | undefined>(undefined);

    const interceptRecurringAction = React.useCallback((
        event: AppEvent, 
        actionType: "edit" | "delete", 
        _updatesOrNone: Partial<AppEvent> | undefined, 
        executeImmediately: (mode: RecurringMode) => void
    ) => {
        const isRecurring = !!event.rrule || !!event.isInstance;
        if (isRecurring) {
            setRecurringPrompt({
                actionType,
                onConfirm: (mode) => {
                    executeImmediately(mode);
                    setRecurringPrompt(undefined);
                }
            });
        } else {
            executeImmediately("instance");
        }
    }, []);

    const { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask } = usePlanActions(timelineDate, setInspectorState, hydratedEvents, interceptRecurringAction);
    const { onTaskDragStart, onEventDragStart, dragState, setDragState } = useDragAndDrop(timelineDate, setInspectorState, createEvent, interceptRecurringAction);

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
                                setView={(v: string) => setView(v === "month" ? "month" : "week")}
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
                                dragState={dragState}
                                onEventDragStart={onEventDragStart}
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
                                dragState={dragState}
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
                    onClose={() => setInspectorState(undefined)}
                    tasks={tasks}
                    setTasks={setTasks}
                    events={hydratedEvents}
                    setEvents={setEvents}
                    interceptRecurringAction={interceptRecurringAction}
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



            <RecurringActionModal 
                isOpen={!!recurringPrompt} 
                actionType={recurringPrompt?.actionType || "edit"} 
                onConfirm={recurringPrompt?.onConfirm || (() => {})} 
                onCancel={() => setRecurringPrompt(undefined)} 
            />
        </>
    );
}

