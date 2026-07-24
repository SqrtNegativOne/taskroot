import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import { useCalendars } from "../../core/store/hooks";
import { TitleInput, DescriptionInput } from "./inspector-shared";
import { TaskInspector } from "./inspector-task";
import { EventInspector } from "./inspector-event";

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
    const [activeState, setActiveState] = React.useState<{ type: string; id: string } | null>(null);
    const paneRef = React.useRef<HTMLDivElement>(null);
    const [calendars] = useCalendars() as unknown as [{ id: string, summary?: string | undefined }[], unknown, unknown];

    React.useEffect(() => {
        if (inspectorState) setActiveState(inspectorState);
    }, [inspectorState]);

    const currentState = inspectorState || activeState;

    const isCurrentTask = currentState?.type === "task";
    const currentItem = currentState
        ? isCurrentTask
            ? tasks.find((t: AppTask) => t.id === currentState.id)
            : events.find((e: AppEvent) => e.id === currentState.id) ||
              events.find((e: AppEvent) => e.id === currentState.id.split("_")[0])
        : null;



    const isReadOnlyCalendar = React.useMemo(() => {
        if (isCurrentTask || !currentItem) return false;
        const calId = (currentItem as AppEvent).googleCalendarId || "primary";
        const cal = calendars.find((c: any) => c.id === calId) as any;
        return cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader");
    }, [isCurrentTask, currentItem, calendars]);

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
                !paneRef.current.contains(e.target as Node)
            ) {
                handleClose();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () =>
            document.removeEventListener("pointerdown", handleClickOutside);
    }, [inspectorState, handleClose]);

    const isOpen = !!(inspectorState && currentItem);

    const title = currentItem
        ? isCurrentTask
            ? (currentItem as AppTask).title
            : (currentItem as AppEvent).taskId
              ? tasks.find((t: AppTask) => t.id === (currentItem as AppEvent).taskId)?.title
              : (currentItem as AppEvent).title
        : "";

    const updateTask = (id: string, updates: Partial<AppTask>) =>
        setTasks((ts: AppTask[]) =>
            ts.map((t: AppTask) =>
                t.id === id ? { ...t, ...updates, isDraft: false } : t,
            ),
        );
    const deleteTask = (id: string) => setTasks((ts: AppTask[]) => ts.filter((t: AppTask) => t.id !== id));
    const updateEvent = (id: string, updates: Partial<AppEvent>) =>
        setEvents((es: AppEvent[]) =>
            es.map((e: AppEvent) =>
                e.id === id ? { ...e, ...updates, isDraft: false } : e,
            ),
        );
    const deleteEvent = (id: string) =>
        setEvents((es: AppEvent[]) => es.filter((e: AppEvent) => e.id !== id));

    return (
        <div
            ref={paneRef}
            className={`inspector-pane ${isOpen ? "is-open" : ""}`}
        >
            {currentItem && (
                <React.Fragment key={currentItem.id}>
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
                            onClick={() => {
                                if (isCurrentTask) {
                                    deleteTask(currentItem.id);
                                    setEvents((es: AppEvent[]) =>
                                        es.filter(
                                            (e) => e.taskId !== currentItem.id,
                                        ),
                                    );
                                } else {
                                    deleteEvent(currentItem.id);
                                }
                                handleClose();
                            }}
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
                    <div className="inspector-body" style={{ paddingTop: 0 }}>
                        <div
                            className="inspector-field"
                            style={{ marginTop: "24px", marginBottom: "4px" }}
                        >
                            <TitleInput
                                value={title || ""}
                                onChange={(newTitle) => {
                                    if (isCurrentTask)
                                        updateTask(currentItem.id, {
                                            title: newTitle,
                                        });
                                    else
                                        updateEvent(currentItem.id, {
                                            title: newTitle,
                                        });
                                }}
                                disabled={Boolean(!isCurrentTask && (currentItem as AppEvent).taskId) || isReadOnlyCalendar}
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
                                autoFocus={Boolean((currentItem as AppTask).isDraft)}
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
                                value={((currentItem as AppEvent).description as string) || ""}
                                onChange={(desc) => {
                                    if (isReadOnlyCalendar) return;
                                    if (isCurrentTask)
                                        updateTask(currentItem.id, {
                                            description: desc,
                                        });
                                    else
                                        updateEvent(currentItem.id, {
                                            description: desc,
                                        });
                                }}
                            />
                        </div>

                        {isReadOnlyCalendar && (
                            <div className="inspector-field" style={{color: "var(--tag-red)", fontSize: "0.85em", marginTop: "8px"}}>
                                This event belongs to a read-only calendar and cannot be modified.
                            </div>
                        )}

                        {isCurrentTask ? (
                            <TaskInspector 
                                task={currentItem as AppTask} 
                                updateTask={updateTask} 
                            />
                        ) : (
                            <EventInspector 
                                event={currentItem as AppEvent} 
                                tasks={tasks}
                                calendars={calendars}
                                updateEvent={updateEvent}
                                isReadOnlyCalendar={isReadOnlyCalendar}
                            />
                        )}
                    </div>
                </React.Fragment>
            )}
        </div>
    );
}
