import React from "react";
import Fuse from "fuse.js";
import { Icon } from "../icon";
import { SearchBar } from "../search-bar";
import { FilterSortButtons } from "../../screens/plan/shared-menus";
import { computeFilterDefaults } from "../../core/domain/filters";
import type { AppTask, AppFilter } from "../../core/domain/models";
import { TaskRow } from "./task-row";

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
