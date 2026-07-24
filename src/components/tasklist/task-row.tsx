import React, { useState } from "react";
import { TODAY, parseYMD, durationLabel, dueLabel } from "../../core/store/data";
import type { AppTask, AppFilter } from "../../core/domain/models";
import { checkTaskAgainstFilters } from "./filters";

export interface TaskRowProps {
    task: AppTask;
    onDragStart?: (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, task: AppTask) => void;
    dragging?: boolean;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
    deleteTask: (id: string) => void;
    filters: AppFilter[];
}

export function TaskRow({
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
