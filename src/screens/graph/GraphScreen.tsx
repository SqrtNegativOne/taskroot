
import { useTasks, useTaskQuery, useTaskFilters, useTaskSort } from "../../core/store/hooks";
import { TaskListPane } from "../../components/tasklist";
import { SplitPane } from "../../components/split-pane";
import { TaskCanvas } from "./TaskCanvas";
import type { AppTask } from "../../core/domain/models";

export const ANIMATION_DELAY_MS = 150;
export const DRAG_THRESHOLD_PX = 4;
export const GRAPH_NODE_WIDTH_PX = 250;


export function GraphScreen() {
    const [tasks, setTasks] = useTasks();

    const [query, setQuery] = useTaskQuery();
    const [filters, setFilters] = useTaskFilters();
    const [sort, setSort] = useTaskSort();

    const moveFilteredToCanvas = () => {
        let xs = tasks;
        for (const f of filters) {
            if (!f.column || (!f.value && f.value !== 0)) continue;
            xs = xs.filter((t: AppTask) => {
                let match = false;
                const values = Array.isArray(f.value) ? f.value : [f.value];
                if (values.length === 0) return true;
                
                if (f.column === "status") match = values.includes(t.status || "");
                else if (f.column === "priority")
                    match = values.includes(t.priority || 0) || values.includes(String(t.priority));
                else if (f.column === "tag")
                    match = values.some(v => (t.tags || []).includes(String(v)));
                return f.operator === "is not" ? !match : match;
            });
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            xs = xs.filter(
                (t: AppTask) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.tags || []).some((tag) => tag.toLowerCase().includes(q)),
            );
        }

        const idsToMove = new Set(xs.map((t: AppTask) => t.id));

        setTasks((prev: AppTask[]) => {
            let layoutIndex = 0;
            return prev.map((t: AppTask) => {
                if (!idsToMove.has(t.id) || t.onCanvas)
                    return t;

                const newT = {
                    ...t,
                    onCanvas: true,
                    canvasX: (layoutIndex % DRAG_THRESHOLD_PX) * GRAPH_NODE_WIDTH_PX,
                    canvasY: Math.floor(layoutIndex / DRAG_THRESHOLD_PX) * ANIMATION_DELAY_MS,
                };
                layoutIndex++;
                return newT;
            });
        });
    };

    const footer = (
        <div
            style={{
                padding: "12px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-surface)",
            }}
        >
            <button
                onClick={moveFilteredToCanvas}
                style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                }}
            >
                Move to canvas
            </button>
        </div>
    );

    return (
        <>
            <main className="main">
                <SplitPane
                    direction="horizontal"
                    defaultSize={360}
                    minSize={200}
                    snapThreshold={50}
                >
                    <TaskListPane
                        tasks={tasks}
                        setTasks={setTasks}
                        filters={filters}
                        setFilters={setFilters}
                        sort={sort}
                        setSort={setSort}
                        query={query}
                        setQuery={setQuery}
                        onDragStart={() => {}}
                        onAddTask={(defaults: Partial<AppTask> = {}) => {
                            const id = `t${Date.now()}`;
                            setTasks((ts: AppTask[]) => [
                                {
                                    id,
                                    title: "New Task",
                                    status: "todo",
                                    priority: 1,
                                    tags: [],
                                    subtasks: [],
                                    parent_task: null,
                                    dependencies: [],
                                    est: 60,
                                    added: new Date().toISOString(),
                                    ...defaults,
                                },
                                ...ts,
                            ]);
                        }}
                        onDeleteTask={(id: string) =>
                            setTasks((ts: AppTask[]) => ts.filter((t) => t.id !== id))
                        }
                        footer={footer}
                    />
                    <div
                        className="right-pane"
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        <TaskCanvas tasks={tasks} setTasks={setTasks} />
                    </div>
                </SplitPane>
            </main>
        </>
    );
}
