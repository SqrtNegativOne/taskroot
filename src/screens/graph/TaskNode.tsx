
import { Handle, Position } from "@xyflow/react";
import type { AppTask as Task } from "../../core/domain/models";




export interface TaskNodeProps {
    data: { task: Task; [key: string]: unknown };
    id: string;
}

export const TaskNodeComponent = ({ data }: TaskNodeProps) => {
    const task = data.task;

    return (
        <div
            className={`task-canvas-node ${task.status === "done" ? "is-done" : ""}`}
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "12px",
                minWidth: "200px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                position: "relative",
                opacity: task.status === "done" ? OPACITY_MUTED : 1,
            }}
        >
            {/* Top Target Handle: Parent connection */}
            <Handle
                type="target"
                position={Position.Top}
                id="parent"
                style={{ background: "var(--accent)" }}
            />

            {/* Left Target Handle: Dependency connection (This task requires the source task) */}
            <Handle
                type="target"
                position={Position.Left}
                id="dependency"
                style={{ background: "#d9866b" }}
            />

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                }}
            >
                <span className={`pri pri-${task.priority}`}>●</span>
                <strong style={{ color: "var(--fg)" }}>{task.title}</strong>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {task.status && (
                    <span
                        className={`status-pill status-${task.status.replace("-", "")}`}
                    >
                        {task.status}
                    </span>
                )}
            </div>

            {/* Bottom Source Handle: Subtask connection (Connects to a child task's Top) */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="child"
                style={{ background: "var(--accent)" }}
            />

            {/* Right Source Handle: Dependent connection (Connects to a dependent task's Left) */}
            <Handle
                type="source"
                position={Position.Right}
                id="dependent"
                style={{ background: "#d9866b" }}
            />
        </div>
    );
};
