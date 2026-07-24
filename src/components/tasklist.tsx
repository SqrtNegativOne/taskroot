import React, {
    useState,
} from "react";

import Fuse from "fuse.js";
import { TODAY, parseYMD, durationLabel, dueLabel } from "../core/store/data";
import { Icon } from "./icon";
import { SearchBar } from "./search-bar";
import { FilterSortButtons } from "../screens/plan/shared-menus";
import { computeFilterDefaults } from "../core/domain/filters";
import type { AppTask, AppFilter } from "../core/domain/models";

function matchesFilterValue(task: AppTask, column: string, values: (string | number)[]) {
    if (column === "status") return values.includes(task.status || "");
    if (column === "priority") return values.includes(task.priority || 0) || values.includes(String(task.priority));
    if (column === "tag") return values.some((v) => (task.tags || []).includes(String(v)));
    return false;
}

function checkTaskAgainstFilters(task: AppTask, filters?: AppFilter[]) {
    if (!filters || filters.length === 0) return false;
    for (const f of filters) {
        if (!f.column || (!f.value && f.value !== 0)) continue;
        const values = Array.isArray(f.value) ? f.value : [f.value];
        if (values.length === 0) continue;
        const match = matchesFilterValue(task, f.column, values);
        const passes = f.operator === "is not" ? !match : match;
        if (!passes) return true;
    }
    return false;
}

// Task list: left column. Filter, sort, draggable items.

export interface TaskListPaneProps {
    tasks: AppTask[];
    setTasks: React.Dispatch<React.SetStateAction<AppTask[]>>;
    filters: AppFilter[];
    setFilters: React.Dispatch<React.SetStateAction<AppFilter[]>>;
    sort: string;
    setSort: (sort: string) => void;
    query: string;
    setQuery: (q: string) => void;
    onDragStart?: (e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>, task: AppTask) => void;
    activeDragId?: string | null;
    onAddTask: (defaults?: Partial<AppTask>) => void;
    onDeleteTask?: (id: string) => void;
    footer?: React.ReactNode;
}

export function TaskListPane({
    tasks = [],
    setTasks,
    filters = [],
    setFilters,
    sort,
    setSort,
    query = "",
    setQuery,
    onDragStart,
    activeDragId,
    onAddTask,
    onDeleteTask,
    footer,
}: TaskListPaneProps) {
    const updateTask = (id: string, updates: Partial<AppTask>) =>
        setTasks((ts) =>
            ts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        );
    const deleteTask = (id: string) => {
        if (onDeleteTask) {
            onDeleteTask(id);
        } else {
            setTasks((ts) => ts.filter((t) => t.id !== id));
        }
    };

    const allTags = React.useMemo(() => {
        const s = new Set<string>();
        tasks.forEach((t) => (t.tags || []).forEach((tag) => s.add(tag)));
        return Array.from(s).sort();
    }, [tasks]);

    const filtered = React.useMemo(() => {
        let xs = tasks;
        for (const f of filters) {
            if (!f.column || (!f.value && f.value !== 0)) continue;
            xs = xs.filter((t) => {
                let match = false;
                const values = Array.isArray(f.value) ? f.value : [f.value];
                if (values.length === 0) return true;
                
                if (f.column === "status") {
                    match = values.includes(t.status || "");
                } else if (f.column === "priority") {
                    match = values.includes(t.priority || 0) || values.includes(String(t.priority));
                } else if (f.column === "tag") {
                    match = values.some((v) => (t.tags || []).includes(String(v)));
                }
                return f.operator === "is not" ? !match : match;
            });
        }
        if (query.trim()) {
            const fuse = new Fuse(xs, {
                keys: ["title", "tags"],
                threshold: 0.4,
            });
            xs = fuse.search(query).map((result) => result.item);
        }
        const cmp: Record<string, (a: AppTask, b: AppTask) => number> = {
            priority: (a, b) => Number(b.priority || 0) - Number(a.priority || 0),
            due: (a, b) => (a.due || "9999").localeCompare(b.due || "9999"),
            est: (a, b) => (a.est || 0) - (b.est || 0),
            title: (a, b) => a.title.localeCompare(b.title),
            added: () => 0,
        };
        return [...xs].sort(cmp[sort] || (() => 0));
    }, [tasks, filters, sort, query]);

    const handleAddTask = () => {
        onAddTask(computeFilterDefaults(filters));
    };

    return (
        <aside className="task-pane">
            <header className="task-pane-hd">
                <SearchBar value={query} onChange={setQuery} />
                <div
                    className="task-pane-controls"
                    style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        width: "100%",
                    }}
                >
                    <FilterSortButtons
                        filters={filters}
                        setFilters={setFilters}
                        sort={sort}
                        setSort={setSort}
                        columns={[
                            { id: "status", label: "Status" },
                            { id: "priority", label: "Priority" },
                            { id: "tag", label: "Tag" },
                        ]}
                        getValuesForColumn={(col: string) => {
                            if (col === "status")
                                return ["todo", "next-up", "doing", "done"];
                            if (col === "priority") return ["0", "1", "2", "3", "4"];
                            if (col === "tag") return allTags;
                            return [];
                        }}
                        sortOptions={[
                            { id: "priority", label: "Priority" },
                            { id: "due", label: "Due Date" },
                            { id: "est", label: "Estimate" },
                            { id: "title", label: "Title" },
                            { id: "added", label: "Date Added" },
                        ]}
                    />

                    <button
                        style={{
                            marginLeft: "auto",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            color: "var(--fg)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            padding: "4px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        title="Add Task"
                        onClick={handleAddTask}
                    >
                        <Icon name="add_task" size={16} />
                    </button>
                </div>
            </header>

            <div
                className="task-list"
                onDoubleClick={(e) => {
                    if (!(e.target instanceof Element)) return;
                    const target = e.target;
                    if (
                        !target.closest(".task-row") &&
                        !target.closest("button")
                    ) {
                        handleAddTask();
                    }
                }}
            >
                {filtered.length === 0 ? (
                    <div className="task-empty">
                        <span className="dim">
                            {tasks.length === 0
                                ? "no tasks exist."
                                : "no tasks match."}
                        </span>
                    </div>
                ) : (
                    filtered.map((t) => (
                        <TaskRow
                            key={t.id}
                            task={t}
                            onDragStart={onDragStart}
                            dragging={activeDragId === t.id}
                            updateTask={updateTask}
                            deleteTask={deleteTask}
                            filters={filters}
                        />
                    ))
                )}
            </div>

            {footer}
        </aside>
    );
}

export interface TaskRowProps {
    task: AppTask;
    onDragStart?: (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, task: AppTask) => void;
    dragging?: boolean;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
    deleteTask: (id: string) => void;
    filters: AppFilter[];
}

function TaskRow({
    task,
    onDragStart,
    dragging,
    updateTask,
    deleteTask,
    filters,
}: TaskRowProps) {
    const [isExiting, setIsExiting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const willBeFilteredOut = (newStatus: string) => {
        return checkTaskAgainstFilters({ ...task, status: newStatus }, filters);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        if (
            (e.target as Element).closest(".task-row-subtask-toggle") ||
            (e.target as Element).closest(".task-row-actions") ||
            (e.target as Element).closest(".task-circle")
        )
            return;
        onDragStart?.(e, task);
    };

    const dueStr = task.due ? dueLabel(task.due, TODAY) : "";
    const overdue =
        task.due && parseYMD(task.due) < TODAY && task.status !== "done";

    return (
        <div
            className={`task-row ${dragging ? "is-dragging" : ""} ${task.status === "done" ? "is-done" : ""} ${isExiting ? "is-exiting" : ""}`}
            onPointerDown={handlePointerDown}
        >
            <button
                type="button"
                className={`task-circle pri-bg-${task.priority}`}
                style={{ border: "none", padding: 0, font: "inherit", color: "inherit" }}
                onClick={(e) => {
                    e.stopPropagation();
                    const newStatus = task.status === "done" ? "todo" : "done";
                    const isRemoving = willBeFilteredOut(newStatus);

                    if (newStatus === "done") {
                        setIsChecking(true);
                        import("cuelume").then(({ play }) => play("success"));
                    } else {
                        import("cuelume").then(({ play }) => play("release"));
                    }

                    if (isRemoving) {
                        setIsExiting(true);
                        setTimeout(() => {
                            updateTask(task.id, { status: newStatus });
                            setIsChecking(false);
                            setIsExiting(false);
                        }, 400);
                        return;
                    }

                    updateTask(task.id, { status: newStatus });
                    if (newStatus === "todo") {
                        setIsChecking(false);
                    }
                }}
                title="Toggle Done"
                aria-label={`Priority ${task.priority}`}
            >
                {(task.status === "done" || isChecking) && (
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
            <div className="task-row-content">
                <div className="task-row-line1">
                    <span className="task-row-title">{task.title}</span>
                    {task.status === "doing" && (
                        <span className="status-pill status-doing">doing</span>
                    )}
                    {task.status === "next-up" && (
                        <span className="status-pill status-nextup">
                            next up
                        </span>
                    )}

                    <div className="task-row-actions">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (e.shiftKey || confirm("Delete task?")) {
                                    setIsExiting(true);
                                    setTimeout(() => deleteTask(task.id), 400);
                                }
                            }}
                            title="Delete"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontSize: "18px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                delete
                            </span>
                        </button>
                    </div>
                </div>
                    <TaskRowLine2 task={task} dueStr={dueStr} overdue={Boolean(overdue)} />
            </div>
        </div>
    );
}

function TaskRowLine2({ task, dueStr, overdue }: { task: AppTask; dueStr: string; overdue: boolean }) {
    const tags = task.tags || [];
    const subtasks = task.subtasks || [];
    const est = task.est || 0;
    const hasTags = tags.length > 0;
    const hasSubtasks = subtasks.length > 0;
    const hasEst = est > 0;

    if (!hasEst && !hasTags && !hasSubtasks && !dueStr) {
        return null;
    }

    const doneSubtasks = hasSubtasks ? subtasks.filter((s) => s.done).length : 0;
    const totalSubtasks = subtasks.length;

    return (
        <div className="task-row-line2">
            {hasEst && (
                <>
                    <span className="meta-est">
                        {durationLabel(est)}
                    </span>
                    {hasTags && <span className="meta-sep">·</span>}
                </>
            )}
            
            {tags.map((tag, i) => (
                <React.Fragment key={tag}>
                    <span className="meta-tag">#{tag}</span>
                    {i < tags.length - 1 && <span className="meta-tag-sep">,</span>}
                </React.Fragment>
            ))}
            
            <span className="meta-spacer" />
            
            {hasSubtasks && (
                <span
                    className="meta-subtasks"
                    title={`${doneSubtasks}/${totalSubtasks} subtasks done`}
                >
                    ☐{doneSubtasks}/{totalSubtasks}
                </span>
            )}
            
            {dueStr && (
                <span className={`meta-due ${overdue ? "is-overdue" : ""}`}>
                    due {dueStr}
                </span>
            )}
        </div>
    );
}

