import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { useCalendars } from "../../core/store/hooks";
import type { CalendarData } from "../../core/store/repositories";
import { getInspectorTitle } from "./inspector-utils";
import { InspectorPaneContent } from "./inspector-content";
import "./inspector.css";

export type InspectorState = 
    | { type: "task"; id: string }
    | { type: "event"; id: string }
    | { type: "new_task"; draft: AppTask }
    | { type: "new_event"; draft: AppEvent };

interface InspectorPaneProps {
    inspectorState?: InspectorState;
    onClose: () => void;
    tasks: AppTask[];
    setTasks: React.Dispatch<React.SetStateAction<AppTask[]>>;
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
}

function useCurrentItem(
    currentState: InspectorState | undefined,
    tasks: AppTask[],
    events: AppEvent[],
    draftItem: AppTask | AppEvent | undefined
) {
    if (!currentState) return { isCurrentTask: false, isNew: false };

    switch (currentState.type) {
        case "new_task": {
            const taskDraft = (draftItem && "status" in draftItem) ? draftItem : undefined;
            return { currentTask: taskDraft, currentEvent: undefined, currentItem: draftItem, isCurrentTask: true, isNew: true };
        }
        case "new_event": {
            // Necessary because TS cannot infer that checking for 'date' guarantees an AppEvent here
            // oxlint-disable-next-line typescript/consistent-type-assertions
            const eventDraft = (draftItem && "date" in draftItem) ? (draftItem as AppEvent) : undefined;
            return { currentTask: undefined, currentEvent: eventDraft, currentItem: draftItem, isCurrentTask: false, isNew: true };
        }
        case "task": {
            const currentTask = tasks.find((t) => t.id === currentState.id);
            return { currentTask, currentEvent: undefined, currentItem: currentTask, isCurrentTask: true, isNew: false };
        }
        case "event": {
            const currentEvent = events.find((e) => e.id === currentState.id) || events.find((e) => e.id === currentState.id.split("_")[0]);
            return { currentTask: undefined, currentEvent, currentItem: currentEvent, isCurrentTask: false, isNew: false };
        }
    }
}

export function InspectorPane({
    inspectorState,
    onClose,
    tasks,
    setTasks,
    events,
    setEvents,
}: InspectorPaneProps) {
    const paneRef = React.useRef<HTMLDivElement>(null);
    const [calendars] = useCalendars();

    const [activeState, setActiveState] = React.useState<InspectorState>();
    const [draftItem, setDraftItem] = React.useState<AppTask | AppEvent>();
    const draftRef = React.useRef<AppTask | AppEvent | undefined>(undefined);

    React.useEffect(() => {
        if (inspectorState?.type === "new_task" || inspectorState?.type === "new_event") {
            setDraftItem(inspectorState.draft);
            draftRef.current = inspectorState.draft;
        } else if (!inspectorState) {
            setDraftItem(undefined);
            draftRef.current = undefined;
        }
        if (inspectorState) setActiveState(inspectorState);
    }, [inspectorState]);

    const currentState = inspectorState || activeState;
    const { currentTask, currentEvent, currentItem, isCurrentTask, isNew } = useCurrentItem(currentState, tasks, events, draftItem);

    const isReadOnlyCalendar = React.useMemo(() => {
        if (!currentEvent) return false;
        const calId = currentEvent.googleCalendarId || calendars.find((c: CalendarData) => c.primary)?.id || "primary";
        const cal = calendars.find((c: CalendarData) => c.id === calId);
        return Boolean(cal && cal.accessRole !== "owner" && cal.accessRole !== "writer");
    }, [currentEvent, calendars]);

    const title = getInspectorTitle(currentTask, currentEvent, tasks);
    const isOpen = !!(inspectorState && currentItem);

    const updateTask = React.useCallback((id: string, updates: Partial<AppTask>) => {
        if (isNew && draftRef.current && draftRef.current.id === id) {
            if ("status" in draftRef.current) {
                const next: AppTask = { ...draftRef.current, ...updates };
                draftRef.current = next;
                setDraftItem(next);
            }
        } else {
            setTasks((ts) => ts.map((t) => t.id === id ? { ...t, ...updates } : t));
        }
    }, [setTasks, isNew]);

    const updateEvent = React.useCallback((id: string, updates: Partial<AppEvent>) => {
        if (isNew && draftRef.current && draftRef.current.id === id) {
            if ("date" in draftRef.current) {
                // Necessary because spreading a narrowed union type with Partial updates loses strict type fidelity in TS
                // oxlint-disable-next-line typescript/consistent-type-assertions
                const next = { ...draftRef.current, ...updates } as AppEvent;
                draftRef.current = next;
                setDraftItem(next);
            }
        } else {
            setEvents((es) => es.map((e) => e.id === id ? { ...e, ...updates } : e));
        }
    }, [setEvents, isNew]);

    const handleTitleChange = React.useCallback((newTitle: string) => {
        if (!currentItem) return;
        if (isCurrentTask) updateTask(currentItem.id, { title: newTitle });
        else updateEvent(currentItem.id, { title: newTitle });
    }, [currentItem, isCurrentTask, updateTask, updateEvent]);

    const handleDescChange = React.useCallback((desc: string) => {
        if (isReadOnlyCalendar || !currentItem) return;
        if (isCurrentTask) updateTask(currentItem.id, { description: desc });
        else updateEvent(currentItem.id, { description: desc });
    }, [currentItem, isCurrentTask, isReadOnlyCalendar, updateTask, updateEvent]);

    const onPaneDelete = React.useCallback(() => {
        if (!currentItem) return;
        if (isNew) {
            onClose();
            return;
        }
        if (isCurrentTask) {
            setTasks((ts) => ts.filter((t) => t.id !== currentItem.id));
            setEvents((es) => es.filter((e) => e.taskId !== currentItem.id));
        } else {
            setEvents((es) => es.filter((e) => e.id !== currentItem.id && e.id !== currentItem.id.split("_")[0]));
        }
        onClose();
    }, [currentItem, isCurrentTask, isNew, setTasks, setEvents, onClose]);

    const onPaneClose = React.useCallback(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        const draft = draftRef.current;
        if (isNew && draft) {
            if (draft.title && draft.title.trim() !== "") {
                if ("status" in draft) {
                    // Necessary because TS cannot infer the narrowed type inside the generic callback
                    // oxlint-disable-next-line typescript/consistent-type-assertions
                    setTasks((ts) => [draft as AppTask, ...ts]);
                } else if ("date" in draft) {
                    // Necessary because TS cannot infer the narrowed type inside the generic callback
                    // oxlint-disable-next-line typescript/consistent-type-assertions
                    setEvents((es) => [...es, draft as AppEvent]);
                }
            }
        }
        onClose();
    }, [isNew, setTasks, setEvents, onClose]);

    React.useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (
                inspectorState &&
                paneRef.current &&
                !(e.target instanceof Node && paneRef.current.contains(e.target))
            ) {
                onPaneClose();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [inspectorState, onPaneClose]);

    return (
        <div
            ref={paneRef}
            className={`inspector-pane ${isOpen ? "is-open" : ""}`}
        >
            {currentItem && (
                <InspectorPaneContent
                    currentItem={currentItem}
                    currentTask={currentTask}
                    currentEvent={currentEvent}
                    isReadOnlyCalendar={isReadOnlyCalendar}
                    title={title}
                    tasks={tasks}
                    calendars={calendars}
                    onPaneClose={onPaneClose}
                    onPaneDelete={onPaneDelete}
                    handleTitleChange={handleTitleChange}
                    handleDescChange={handleDescChange}
                    updateTask={updateTask}
                    updateEvent={updateEvent}
                    isNew={isNew}
                />
            )}
        </div>
    );
}
