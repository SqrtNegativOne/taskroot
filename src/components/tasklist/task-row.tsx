import React, { useState } from "react";
import { TODAY, parseYMD, durationLabel, dueLabel } from "../../core/store/data";
import { type AppTask, type AppFilter, isAppTaskStatus } from "../../core/domain/models";
import { checkTaskAgainstFilters } from "./filters";
import { Icon } from "../icon";
import { ICON_OVERDUE, ICON_TABS } from "../../core/utils/icons";
import { TaskCircle } from "../task-circle";

const TRANSITION_DURATION_MS = 400;


export interface TaskRowProps {
    task: AppTask;
    onDragStart?: (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, task: AppTask) => void;
    dragging?: boolean;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
    deleteTask: (id: string) => void;
    filters: AppFilter[];
    isPastDue?: boolean;
}

export function TaskRow({
    task,
    onDragStart,
    dragging,
    updateTask,
    deleteTask,
    filters,
    isPastDue,
}: TaskRowProps) {
    const [isExiting, setIsExiting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const willBeFilteredOut = (newStatus: AppTask["status"]) => {
        return checkTaskAgainstFilters({ ...task, status: newStatus }, filters);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        if (e.target instanceof Element && (
            e.target.closest(".task-row-subtask-toggle") ||
            e.target.closest(".task-row-actions") ||
            e.target.closest(".task-circle")
        ))
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
            <TaskCircle
                priority={task.priority}
                isDoneOrChecking={task.status === "done" || isChecking}
                isActive={task.status === "doing"}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (task.status !== "doing") {
                        updateTask(task.id, { status: "doing" });
                    } else {
                        updateTask(task.id, { status: "todo" });
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    const newStatus = task.status === "done" ? "todo" : "done";
                    const isRemoving = willBeFilteredOut(newStatus);

                    if (newStatus === "done") {
                        setIsChecking(true);
                        void import("cuelume").then(({ play }) => play("success"));
                    } else {
                        void import("cuelume").then(({ play }) => play("release"));
                    }

                    if (isRemoving) {
                        setIsExiting(true);
                        setTimeout(() => {
                            updateTask(task.id, { status: newStatus });
                            setIsChecking(false);
                            setIsExiting(false);
                        }, TRANSITION_DURATION_MS);
                        return;
                    }

                    updateTask(task.id, { status: newStatus });
                    if (newStatus === "todo") {
                        setIsChecking(false);
                    }
                }}
            />
            <div className="task-row-content">
                <TaskRowLine1 
                    task={task} 
                    isPastDue={isPastDue} 
                    updateTask={updateTask} 
                    deleteTask={deleteTask} 
                    setIsExiting={setIsExiting} 
                />
                { (task.est || (task.tags && task.tags.length > 0) || (task.subtasks && task.subtasks.length > 0) || dueStr) && (
                    <TaskRowLine2 task={task} dueStr={dueStr} overdue={Boolean(overdue)} />
                )}
            </div>
        </div>
    );
}

function TaskRowLine1({
    task,
    isPastDue,
    updateTask,
    deleteTask,
    setIsExiting,
}: {
    task: AppTask;
    isPastDue?: boolean;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
    deleteTask: (id: string) => void;
    setIsExiting: (exiting: boolean) => void;
}) {
    return (
        <div className="task-row-line1">
            <span className="task-row-title">
                {isPastDue && task.status !== "done" && (
                    <Icon name={ICON_OVERDUE} size={14} style={{ marginRight: '4px', color: 'var(--p0)', verticalAlign: 'middle' }} />
                )}
                {task.title}
                {task.tabs && (
                    <button
                        className="open-tabs-button"
                        title="Open Tabs"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            const urls = task.tabs?.match(/https?:\/\/[^\s"']+/g) || [];
                            urls.forEach((url) => window.open(url, '_blank'));
                        }}
                        style={{
                            cursor: 'pointer',
                            marginLeft: '6px',
                            verticalAlign: 'middle',
                            display: 'inline-flex',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                        }}
                    >
                        <Icon name={ICON_TABS} size={16} style={{ color: 'var(--accent)' }} />
                    </button>
                )}
            </span>
            {task.status === "next-up" && (
                <span className="status-pill status-nextup">
                    next up
                </span>
            )}
            <select
                className="status-select"
                value={task.status || "todo"}
                onChange={(e) => {
                    const val = e.target.value;
                    if (isAppTaskStatus(val)) {
                        updateTask(task.id, { status: val });
                    }
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="next-up">next up</option>
                <option value="done">done</option>
            </select>

            <div className="task-row-actions">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey || confirm("Delete task?")) {
                            setIsExiting(true);
                            setTimeout(() => deleteTask(task.id), TRANSITION_DURATION_MS);
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
    );
}

function TaskRowLine2({ task, dueStr, overdue }: { task: AppTask; dueStr: string; overdue: boolean }) {
    const tags = task.tags || [];
    const subtasks = task.subtasks || [];
    const est = task.est || 0;
    const hasTags = tags.length > 0;
    const hasSubtasks = subtasks.length > 0;
    const hasEst = est > 0;


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
