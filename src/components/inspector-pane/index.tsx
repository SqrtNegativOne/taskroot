import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { useCalendars } from "../../core/store/hooks";
import { TitleInput, DescriptionInput } from "./inspector-shared";
import { TaskInspector } from "./inspector-task";
import { EventInspector } from "./inspector-event";
import "./inspector.css";

interface InspectorPaneProps {
    inspectorState: { type: string; id: string } | null;
    onClose: () => void;
    tasks: AppTask[];
    setTasks: React.Dispatch<React.SetStateAction<AppTask[]>>;
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
}

function getInspectorTitle(currentTask: AppTask | undefined, currentEvent: AppEvent | undefined, tasks: AppTask[]): string {
    if (currentTask) return currentTask.title || "";
    if (currentEvent) {
        if (currentEvent.taskId) {
            return tasks.find((t: AppTask) => t.id === currentEvent.taskId)?.title || "";
        }
        return currentEvent.title || "";
    }
    return "";
}

export function InspectorPane({
    inspectorState,
    onClose,
    tasks,
    setTasks,
    events,
    setEvents,
}: InspectorPaneProps) {
    const [activeState, setActiveState] = React.useState<{ type: string; id: string } | null>(null);
    const paneRef = React.useRef<HTMLDivElement>(null);
    const [calendars] = useCalendars();

    React.useEffect(() => {
        if (inspectorState) setActiveState(inspectorState);
    }, [inspectorState]);

    const currentState = inspectorState || activeState;

    const currentTask: AppTask | undefined = currentState?.type === "task" ? tasks.find((t: AppTask) => t.id === currentState.id) : undefined;
    const currentEvent: AppEvent | undefined = currentState?.type === "event" ? (events.find((e: AppEvent) => e.id === currentState.id) || events.find((e: AppEvent) => e.id === currentState.id.split("_")[0])) : undefined;
    const currentItem = currentTask || currentEvent || null;
    const isCurrentTask = !!currentTask;

    const isReadOnlyCalendar = React.useMemo(() => {
        if (!currentEvent) return false;
        const calId = currentEvent.googleCalendarId || "primary";
        const cal = calendars.find((c: { id: string, accessRole?: string }) => c.id === calId);
        return cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader");
    }, [currentEvent, calendars]);

    const handleClose = React.useCallback(() => {
        if (!(inspectorState && currentItem && currentItem.isDraft)) {
            onClose();
            return;
        }

        if (isCurrentTask) {
            setTasks((ts: AppTask[]) => {
                const t = ts.find((x: AppTask) => x.id === currentItem.id);
                if (t && t.isDraft) {
                    setEvents((es: AppEvent[]) =>
                        es.filter((e: AppEvent) => e.taskId !== currentItem.id),
                    );
                    return ts.filter((x: AppTask) => x.id !== currentItem.id);
                }
                return ts;
            });
        } else {
            setEvents((es: AppEvent[]) => {
                const e = es.find((x: AppEvent) => x.id === currentItem.id);
                if (e && e.isDraft)
                    return es.filter((x: AppEvent) => x.id !== currentItem.id);
                return es;
            });
        }

        onClose();
    }, [
        inspectorState,
        currentItem,
        isCurrentTask,
        setTasks,
        setEvents,
        onClose,
    ]);

    React.useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (
                inspectorState &&
                paneRef.current &&
                !paneRef.current.contains(e.target instanceof Node ? e.target : null)
            ) {
                handleClose();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () =>
            document.removeEventListener("pointerdown", handleClickOutside);
    }, [inspectorState, handleClose]);

    const isOpen = !!(inspectorState && currentItem);

    const title = getInspectorTitle(currentTask, currentEvent, tasks);

    const updateTask = React.useCallback((id: string, updates: Partial<AppTask>) =>
        setTasks((ts: AppTask[]) =>
            ts.map((t: AppTask) =>
                t.id === id ? { ...t, ...updates, isDraft: false } : t,
            ),
        ), [setTasks]);
    const deleteTask = React.useCallback((id: string) => setTasks((ts: AppTask[]) => ts.filter((t: AppTask) => t.id !== id)), [setTasks]);
    const updateEvent = React.useCallback((id: string, updates: Partial<AppEvent>) =>
        setEvents((es: AppEvent[]) =>
            es.map((e: AppEvent) =>
                e.id === id ? { ...e, ...updates, isDraft: false } : e,
            ),
        ), [setEvents]);
    const deleteEvent = React.useCallback((id: string) =>
        setEvents((es: AppEvent[]) => es.filter((e: AppEvent) => e.id !== id)), [setEvents]);

    const handleTitleChange = React.useCallback((newTitle: string) => {
        if (!currentItem) return;
        if (isCurrentTask) updateTask(currentItem.id, { title: newTitle });
        else updateEvent(currentItem.id, { title: newTitle });
    }, [currentItem, isCurrentTask, updateTask, updateEvent]);

    const handleDescChange = React.useCallback((desc: string) => {
        if (isReadOnlyCalendar) return;
        if (currentTask) updateTask(currentTask.id, { description: desc });
        else if (currentEvent) updateEvent(currentEvent.id, { description: desc });
    }, [currentTask, currentEvent, isReadOnlyCalendar, updateTask, updateEvent]);

    const handleDelete = React.useCallback(() => {
        if (!currentItem) return;
        if (isCurrentTask) {
            deleteTask(currentItem.id);
            setEvents((es: AppEvent[]) => es.filter((e) => e.taskId !== currentItem.id));
        } else {
            deleteEvent(currentItem.id);
        }
        handleClose();
    }, [currentItem, isCurrentTask, deleteTask, deleteEvent, setEvents, handleClose]);

    return (
        <div
            ref={paneRef}
            className={`inspector-pane ${isOpen ? "is-open" : ""}`}
        >
            {currentItem && (
                <React.Fragment key={currentItem.id}>
                    <InspectorPaneHeader handleClose={handleClose} handleDelete={handleDelete} isReadOnlyCalendar={isReadOnlyCalendar ?? false} />
                    <div className="inspector-body" style={{ paddingTop: 0 }}>
                        <div
                            className="inspector-field"
                            style={{ marginTop: "24px", marginBottom: "4px" }}
                        >
                            <TitleInput
                                value={title || ""}
                                onChange={handleTitleChange}
                                disabled={Boolean(currentEvent?.taskId) || isReadOnlyCalendar}
                                onEnter={handleClose}
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

function InspectorPaneHeader({ handleClose, handleDelete, isReadOnlyCalendar }: { handleClose: () => void, handleDelete: () => void, isReadOnlyCalendar: boolean }) {
    return (
        <div
            className="inspector-hd"
            style={{
                padding: "0 8px",
                borderBottom: "none",
                background: "transparent",
            }}
        >
            <button
                className="inspector-icon-btn"
                onClick={handleClose}
                title="Close Pane"
            >
                <span className="material-symbols-outlined">
                    keyboard_double_arrow_right
                </span>
            </button>
            <button
                className="inspector-icon-btn"
                onClick={handleDelete}
                title="Delete"
                disabled={isReadOnlyCalendar}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", opacity: isReadOnlyCalendar ? 0.3 : 1 }}
                >
                    delete
                </span>
            </button>
        </div>
    );
}
