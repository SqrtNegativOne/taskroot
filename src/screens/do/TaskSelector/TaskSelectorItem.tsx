/* eslint-disable jsx-a11y/prefer-tag-over-role */
import { useState } from "react";
import type { AppTask } from "../../../core/domain/models";
import { TaskCircle } from "../../../components/task-circle";

const FADE_OUT_DURATION_MS = 400;

export interface TaskSelectorItemProps {
    task: AppTask;
    idx: number;
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
    startWithTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
}

export function TaskSelectorItem({
    task,
    idx,
    selectedIndex,
    setSelectedIndex,
    startWithTask,
    updateTask,
}: TaskSelectorItemProps) {
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
            <TaskCircle
                priority={task.priority}
                isDoneOrChecking={isChecking}
                style={{ flexShrink: 0, marginRight: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isExiting) return;
                    setIsChecking(true);
                    setIsExiting(true);
                    import("cuelume").then(({ play }) => play("success"));
                    setTimeout(() => {
                        updateTask(task.id, { status: "done" });
                    }, FADE_OUT_DURATION_MS);
                }}
                ariaLabel={`Complete ${task.title}`}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
            </span>
        </div>
    );
}
