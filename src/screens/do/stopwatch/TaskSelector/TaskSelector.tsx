import { useState, useEffect, useRef, useMemo } from "react";
import type { AppTask, AppEvent } from "../../../../core/domain/models";
import { sortTasksForSelection } from "./sortTasksForSelection";
import "./TaskSelector.css";




const ANIMATION_DELAY_MS = 150;
interface TaskSelectorProps {
    selectorOpen: boolean;
    setSelectorOpen: (open: boolean) => void;
    tasks: AppTask[];
    events: AppEvent[];
    activeTask?: AppTask;
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
    const [selectedIndex, setSelectedIndex] = useState(0);
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

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, sortedTasks]);

    useEffect(() => {
        if (visible) {
            const el = document.querySelector('.modern-task-item.is-selected');
            if (el) {
                el.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex, visible]);

    if (!visible && !isClosing) return;

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
                                    startWithTask(sortedTasks[selectedIndex]?.id || sortedTasks[0].id);
                                } else if (e.key === "Escape") {
                                    setSearchQuery("");
                                    e.stopPropagation();
                                } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    if (sortedTasks.length > 0) {
                                        setSelectedIndex((prev) => (prev + 1) % sortedTasks.length);
                                        import("cuelume").then(({ play }) => play("tick"));
                                    }
                                } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    if (sortedTasks.length > 0) {
                                        setSelectedIndex((prev) => (prev - 1 + sortedTasks.length) % sortedTasks.length);
                                        import("cuelume").then(({ play }) => play("tick"));
                                    }
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
                                selectedIndex={selectedIndex}
                                setSelectedIndex={setSelectedIndex}
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
    selectedIndex,
    setSelectedIndex,
}: {
    sortedTasks: AppTask[];
    startWithTask: (id: string) => void;
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
}) {
    if (sortedTasks.length === 0) {
        return <div className="task-selector-no-results">No tasks match your search.</div>;
    }

    return (
        <>
            {sortedTasks.map((t, idx) => (
                <button
                    type="button"
                    key={t.id}
                    className={`modern-task-item ${idx === selectedIndex ? "is-selected" : ""}`}
                    onPointerEnter={() => {
                        if (selectedIndex !== idx) {
                            setSelectedIndex(idx);
                            import("cuelume").then(({ play }) => play("tick"));
                        }
                    }}
                    onClick={() => startWithTask(t.id)}
                >
                    {t.title}
                </button>
            ))}
        </>
    );
}
