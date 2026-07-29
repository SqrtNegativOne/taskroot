import React from "react";

import type { AppEvent, AppTask } from "../../core/domain/models";
import { useCalendars } from "../../core/store/hooks";
import { TitleInput, DescriptionInput } from "../inputs";
import { TaskInspector } from "./inspector-task";
import { EventInspector } from "./inspector-event";
import { getInspectorTitle } from "./inspector-utils";
import { InspectorPaneHeader } from "./inspector-shared";

import "./inspector.css";

interface InspectorPaneProps {
    inspectorState: { type: string; id: string } | null;
    onClose: () => void;
    tasks: AppTask[];
    setTasks: React.Dispatch<React.SetStateAction<AppTask[]>>;
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
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

    const [activeState, setActiveState] = React.useState<{ type: string; id: string } | null>(null);
    React.useEffect(() => {
        if (inspectorState) setActiveState(inspectorState);
    }, [inspectorState]);

    const currentState = inspectorState || activeState;
    const currentTask = currentState?.type === "task" ? tasks.find((t) => t.id === currentState.id) : undefined;
    const currentEvent = currentState?.type === "event" ? (events.find((e) => e.id === currentState.id) || events.find((e) => e.id === currentState.id.split("_")[0])) : undefined;
    const currentItem = currentTask || currentEvent || null;
    const isCurrentTask = !!currentTask;

    const isReadOnlyCalendar = React.useMemo(() => {
        if (!currentEvent) return false;
        const calId = currentEvent.googleCalendarId || "primary";
        const cal = calendars.find((c) => c.id === calId);
        return cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader");
    }, [currentEvent, calendars]);

    const title = getInspectorTitle(currentTask, currentEvent, tasks);
    const isOpen = !!(inspectorState && currentItem);

    const updateTask = React.useCallback((id: string, updates: Partial<AppTask>) =>
        setTasks((ts) => ts.map((t) => t.id === id ? { ...t, ...updates, isDraft: false } : t)), [setTasks]);

    const updateEvent = React.useCallback((id: string, updates: Partial<AppEvent>) =>
        setEvents((es) => es.map((e) => e.id === id ? { ...e, ...updates, isDraft: false } : e)), [setEvents]);

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
        if (isCurrentTask) {
            setTasks((ts) => ts.filter((t) => t.id !== currentItem.id));
            setEvents((es) => es.filter((e) => e.taskId !== currentItem.id));
        } else {
            setEvents((es) => es.filter((e) => e.id !== currentItem.id));
        }
        onClose();
    }, [currentItem, isCurrentTask, setTasks, setEvents, onClose]);

    const onPaneClose = React.useCallback(() => {
        if (!(inspectorState && currentItem && currentItem.isDraft)) {
            onClose();
            return;
        }

        if (isCurrentTask) {
            setTasks((ts) => {
                const t = ts.find((x) => x.id === currentItem.id);
                if (t && t.isDraft) {
                    setEvents((es) => es.filter((e) => e.taskId !== currentItem.id));
                    return ts.filter((x) => x.id !== currentItem.id);
                }
                return ts;
            });
        } else {
            setEvents((es) => {
                const e = es.find((x) => x.id === currentItem.id);
                if (e && e.isDraft) return es.filter((x) => x.id !== currentItem.id);
                return es;
            });
        }
        onClose();
    }, [inspectorState, currentItem, isCurrentTask, setTasks, setEvents, onClose]);



    React.useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (
                inspectorState &&
                paneRef.current &&
                !paneRef.current.contains(e.target instanceof Node ? e.target : null)
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
                <React.Fragment key={currentItem.id}>
                    <InspectorPaneHeader handleClose={onPaneClose} handleDelete={onPaneDelete} isReadOnlyCalendar={isReadOnlyCalendar ?? false} />
                    <div className="inspector-body" style={{ paddingTop: 0 }}>
                        <div
                            className="inspector-field"
                            style={{ marginTop: "24px", marginBottom: "4px" }}
                        >
                            <TitleInput
                                value={title || ""}
                                onChange={handleTitleChange}
                                disabled={Boolean(currentEvent?.taskId) || isReadOnlyCalendar}
                                onEnter={onPaneClose}
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "normal",
                                    border: "none",
                                    background: "transparent",
                                    padding: "0",
                                    outline: "none",
                                    width: "100%",
                                    color: "var(--fg)",
                                }}
                                autoFocus={Boolean(currentTask?.isDraft)}
                            />
                        </div>
                        <div
                            className="inspector-field"
                            style={{
                                flexDirection: "column",
                                alignItems: "flex-start",
                            }}
                        >
                            <DescriptionInput
                                value={(currentEvent?.description) || ""}
                                onChange={handleDescChange}
                            />
                        </div>

                        {isReadOnlyCalendar && (
                            <div className="inspector-field" style={{color: "var(--tag-red)", fontSize: "0.85em", marginTop: "8px"}}>
                                This event belongs to a read-only calendar and cannot be modified.
                            </div>
                        )}

                        {currentTask ? (
                            <TaskInspector 
                                task={currentTask} 
                                updateTask={updateTask} 
                            />
                        ) : currentEvent ? (
                            <EventInspector 
                                event={currentEvent} 
                                tasks={tasks}
                                calendars={calendars}
                                updateEvent={updateEvent}
                                isReadOnlyCalendar={isReadOnlyCalendar ?? false}
                            />
                        ) : null}
                    </div>
                </React.Fragment>
            )}
        </div>
    );
}

