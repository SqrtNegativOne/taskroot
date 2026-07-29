import { useState, useEffect, useRef, useMemo } from "react";
import type { AppTask, AppEvent } from "../../../../core/domain/models";
import { sortTasksForSelection } from "./sortTasksForSelection";
import "./TaskSelector.css";




interface TaskSelectorProps {
    selectorOpen: boolean;
    setSelectorOpen: (open: boolean) => void;
    tasks: AppTask[];
    events: AppEvent[];
    activeTask: AppTask | null | undefined;
    allowNoTask: boolean;
    startWithTask: (taskId: string) => void;
}

export function TaskSelector({
    selectorOpen,
    setSelectorOpen,
    tasks,
    events,
    activeTask,
    allowNoTask,
    startWithTask,
}: TaskSelectorProps) {
    const [visible, setVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectorOpen) {
            setVisible(true);
            setIsClosing(false);
            setSearchQuery("");
        } else if (visible) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setIsClosing(false);
            }, ANIMATION_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [selectorOpen, visible]);

    useEffect(() => {
        if (selectorOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [selectorOpen]);

    const pendingTasks = useMemo(
        () => (tasks || []).filter((t) => t.status !== "done" && t.status !== "doing"),
        [tasks]
    );

    const sortedTasks = useMemo(
        () => sortTasksForSelection(pendingTasks, events, searchQuery),
        [pendingTasks, events, searchQuery]
    );

    if (!visible && !isClosing) return null;

    const needsBlur = !activeTask && !allowNoTask;

    return (
        <>
            <div
                className={`task-selector-backdrop ${needsBlur ? "with-blur" : ""}`}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectorOpen(false);
                }}
            />

            {pendingTasks.length === 0 ? (
                <div className={`task-selector-overlay ${isClosing ? "is-closing" : "floating-menu"}`}>
                    <div className="task-selector-empty-msg">
                        Create some tasks to start working on them.
                    </div>
                </div>
            ) : (
                <div className={`task-selector-overlay ${isClosing ? "is-closing" : "floating-menu"}`}>
                    <div className="task-selector-content">
                        <input
                            ref={searchInputRef}
                            className="modern-task-input"
                            placeholder="Type a task"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && sortedTasks.length > 0) {
                                    startWithTask(sortedTasks[0].id);
                                } else if (e.key === "Escape") {
                                    setSearchQuery("");
                                    e.stopPropagation();
                                }
                            }}
                        />

                        <div className={`task-selector-divider ${searchQuery.trim().length > 0 ? "has-search" : ""}`}>
                            <div className="task-selector-divider-dot" />
                        </div>

                        <div className="modern-task-list">
                            <TaskSearchResults
                                sortedTasks={sortedTasks}
                                startWithTask={startWithTask}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function TaskSearchResults({
    sortedTasks,
    startWithTask,
}: {
    sortedTasks: AppTask[];
    startWithTask: (id: string) => void;
}) {
    if (sortedTasks.length === 0) {
        return <div className="task-selector-no-results">No tasks match your search.</div>;
    }

    return (
        <>
            {sortedTasks.map((t) => (
                <button
                    type="button"
                    key={t.id}
                    className="modern-task-item"
                    onClick={() => startWithTask(t.id)}
                >
                    {t.title}
                </button>
            ))}
        </>
    );
}
