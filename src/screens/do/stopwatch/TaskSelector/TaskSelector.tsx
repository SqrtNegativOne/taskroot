import { useState, useEffect, useRef, useMemo } from "react";
import type { AppTask, AppEvent } from "../../../../core/domain/models";
import { sortTasksForSelection } from "./sortTasksForSelection";
import { useTasks } from "../../../../core/store/hooks";
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
    const [, setTasks] = useTasks();

    const updateTask = (id: string, updates: Partial<AppTask>) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    };

    useEffect(() => {
        if (selectorOpen) {
            setVisible(true);
            setIsClosing(false);
            setSearchQuery("");
            document.body.classList.add("modal-open");
        } else if (visible) {
            setIsClosing(true);
            document.body.classList.remove("modal-open");
            const timer = setTimeout(() => {
                setVisible(false);
                setIsClosing(false);
            }, ANIMATION_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [selectorOpen, visible]);

    // Cleanup class on unmount
    useEffect(() => {
        return () => {
            document.body.classList.remove("modal-open");
        };
    }, []);

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
                                updateTask={updateTask}
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
    updateTask,
}: {
    sortedTasks: AppTask[];
    startWithTask: (id: string) => void;
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
}) {
    if (sortedTasks.length === 0) {
        return <div className="task-selector-no-results">No tasks match your search.</div>;
    }

    return (
        <>
            {sortedTasks.map((t, idx) => (
                <TaskSelectorItem
                    key={t.id}
                    task={t}
                    idx={idx}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    startWithTask={startWithTask}
                    updateTask={updateTask}
                />
            ))}
        </>
    );
}

function TaskSelectorItem({
    task,
    idx,
    selectedIndex,
    setSelectedIndex,
    startWithTask,
    updateTask,
}: {
    task: AppTask;
    idx: number;
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
    startWithTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
}) {
    const [isExiting, setIsExiting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    return (
        <div
            className={`modern-task-item ${idx === selectedIndex ? "is-selected" : ""} ${isExiting ? "is-exiting" : ""}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter") startWithTask(task.id);
            }}
            onPointerEnter={() => {
                if (selectedIndex !== idx) {
                    setSelectedIndex(idx);
                    import("cuelume").then(({ play }) => play("tick"));
                }
            }}
            onClick={() => startWithTask(task.id)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
            <button
                type="button"
                className={`task-circle pri-bg-${task.priority}`}
                style={{ border: "none", padding: 0, font: "inherit", color: "inherit", flexShrink: 0, marginRight: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isExiting) return;
                    setIsChecking(true);
                    setIsExiting(true);
                    import("cuelume").then(({ play }) => play("success"));
                    setTimeout(() => {
                        updateTask(task.id, { status: "done" });
                    }, 400); // 400ms is fade out duration
                }}
                title="Toggle Done"
                aria-label={`Complete ${task.title}`}
            >
                {isChecking && (
                    <svg
                        className="task-circle-check"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="4 12 9 17 20 6"></polyline>
                    </svg>
                )}
            </button>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
            </span>
        </div>
    );
}
