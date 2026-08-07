
import { useState, useEffect, useRef, useMemo } from "react";
import type { AppTask, AppEvent } from "../../../core/domain/models";
import { sortTasksForSelection } from "./sortTasksForSelection";
import { useTasks } from "../../../core/store/hooks";
import "./TaskSelector.css";




import { TaskSearchResults } from "./TaskSearchResults";
import { useTaskSelectorKeyboard } from "./useTaskSelectorKeyboard";

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
        let timer: ReturnType<typeof setTimeout>;
        if (selectorOpen) {
            setVisible(true);
            setIsClosing(false);
            setSearchQuery("");
            document.body.classList.add("modal-open");
        } else if (visible) {
            setIsClosing(true);
            document.body.classList.remove("modal-open");
            timer = setTimeout(() => {
                setVisible(false);
                setIsClosing(false);
            }, ANIMATION_DELAY_MS);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
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

    const handleKeyDown = useTaskSelectorKeyboard({
        sortedTasks,
        selectedIndex,
        setSelectedIndex,
        setSearchQuery,
        startWithTask,
    });

    if (!visible && !isClosing) return <></>;

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
                            onKeyDown={handleKeyDown}
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
