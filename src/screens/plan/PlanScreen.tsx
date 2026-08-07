import React from "react";
import {
    TODAY,
    } from "../../core/store/data";
import {
    DayTimeline,
    } from "../../components/day-timeline";

import { InspectorPane, type InspectorState } from "../../components/inspector-pane";
import type { AppEvent, AppTask } from "../../core/domain/models";

import { DragGhost, type PlanDragState } from "./drag-helpers";
import { usePlanActions } from "./use-plan-actions";
import { useDragAndDrop } from "./use-drag-and-drop";
import { DateGrid, DateGridView } from "./date-grid";

import { useTasks, useEvents, useSettings, useTaskQuery, useTaskFilters, useTaskSort, useCalFilters, useCalSort, useTimeFilters, useTimeSort } from "../../core/store/hooks";

import { TaskListPane } from "../../components/tasklist";



import { SplitPane } from "../../components/split-pane";
import { FilterSortButtons } from "./shared-menus/index";
import { usePlanEvents, PLAN_EVENT_FILTER_COLUMNS, PLAN_EVENT_SORT_OPTIONS } from "./use-plan-events";
import { RecurringActionModal } from "../../components/RecurringActionModal";
import type { RecurringMode } from "../../core/domain/rrule-utils";

function isDraftTask(draft: AppTask | AppEvent | undefined): draft is AppTask {
    return !!draft && "status" in draft;
}

function isDraftEvent(draft: AppTask | AppEvent | undefined): draft is AppEvent {
    return !!draft && "startTime" in draft;
}

function useRecurringActionInterceptor() {
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
        const isRecurring = !!event.rrule || !!event["isInstance"];
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

    const closeRecurringPrompt = React.useCallback(() => {
        setRecurringPrompt(undefined);
    }, []);

    return { recurringPrompt, interceptRecurringAction, closeRecurringPrompt };
}

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
    const [view, setView] = React.useState<DateGridView>(
        settings.defaultCalendarView === "week" ? DateGridView.Week : DateGridView.Month,
    );
    const [anchor, setAnchor] = React.useState(new Date(TODAY));
    const [timelineDate, setTimelineDate] = React.useState(new Date(TODAY));

    // Event filters
    const [calFilter, setCalFilter] = useCalFilters();
    const [calSort, setCalSort] = useCalSort();
    const [timeFilter, setTimeFilter] = useTimeFilters();
    const [timeSort, setTimeSort] = useTimeSort();

    // Inspector state
    const [inspectorState, setInspectorState] = React.useState<InspectorState>();
    const [activeDraft, setActiveDraft] = React.useState<AppTask | AppEvent | undefined>(undefined);

    const displayTasks = React.useMemo(() => {
        if (isDraftTask(activeDraft))
            return [activeDraft, ...tasks];
        return tasks;
    }, [tasks, activeDraft]);

    const displayEvents = React.useMemo(() => {
        if (isDraftEvent(activeDraft))
            return [activeDraft, ...events];
        return events;
    }, [events, activeDraft]);

    const { hydratedEvents, getEventFilterValues } = usePlanEvents(displayTasks, displayEvents, anchor);

    const { recurringPrompt, interceptRecurringAction, closeRecurringPrompt } = useRecurringActionInterceptor();

    const { createEvent, onAddTask, onAddEvent, onResizeEvent, onMoveEvent, onDeleteTask } = usePlanActions(timelineDate, setInspectorState, hydratedEvents, interceptRecurringAction);
    const { onTaskDragStart, onEventDragStart, dragState, setDragState } = useDragAndDrop(timelineDate, setInspectorState, createEvent, interceptRecurringAction);

    const activeDragIdProp = dragState?.task?.id !== undefined ? { activeDragId: dragState.task.id } : {};
    const dragStateProp = dragState !== undefined ? { dragState } : {};
    const inspectorStateProp = inspectorState !== undefined ? { inspectorState } : {};
    
    const isDragging = dragState && (dragState.task || dragState.event);
    const dragGhostTaskProp = dragState?.task !== undefined ? { task: dragState.task } : {};
    const dragGhostEventProp = dragState?.event !== undefined ? { event: dragState.event } : {};
    
    const isRecurringPromptOpen = !!recurringPrompt;
    const recurringPromptActionType = recurringPrompt?.actionType || "edit";
    const recurringPromptConfirm = recurringPrompt?.onConfirm || (() => {});

    const closeInspector = React.useCallback(() => setInspectorState(undefined), []);
    const onEventClick = React.useCallback((ev: AppEvent) => {
        setInspectorState({
            type: "event",
            id: ev.id,
        });
    }, []);
    const onDropToTime = React.useCallback(() => {}, []);

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
                        tasks={displayTasks}
                        setTasks={setTasks}
                        filters={filters}
                        setFilters={setFilters}
                        sort={sort}
                        setSort={setSort}
                        query={query}
                        setQuery={setQuery}
                        onDragStart={onTaskDragStart}
                        {...activeDragIdProp}
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
                                setView={setView}
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
                                {...dragStateProp}
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
                                {...dragStateProp}
                                setDragState={setDragState}
                                onResizeEvent={onResizeEvent}
                                onMoveEvent={onMoveEvent}
                                onEventClick={onEventClick}
                                onAddEvent={onAddEvent}
                                onDropToTime={onDropToTime}
                            />
                        </SplitPane>
                    </div>
                </SplitPane>

                <InspectorPane
                    {...inspectorStateProp}
                    onClose={closeInspector}
                    tasks={tasks}
                    setTasks={setTasks}
                    events={hydratedEvents}
                    setEvents={setEvents}
                    interceptRecurringAction={interceptRecurringAction}
                    onDraftChange={setActiveDraft}
                />
            </main>

            {isDragging && (
                <DragGhost
                    {...dragGhostTaskProp}
                    {...dragGhostEventProp}
                    x={dragState.pointerX}
                    y={dragState.pointerY}
                    ghostStyle="bracket"
                />
            )}

            <RecurringActionModal 
                isOpen={isRecurringPromptOpen} 
                actionType={recurringPromptActionType} 
                onConfirm={recurringPromptConfirm} 
                onCancel={closeRecurringPrompt} 
            />
        </>
    );
}

