import { MINUTES_IN_HOUR } from "../../core/utils/constants";
const MAX_PRIORITY = 4;
import React from "react";
import type { AppTask } from "../../core/domain/models";
import { TaskStatusSelect } from "./inspector-shared";




interface TaskInspectorProps {
    task: AppTask;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
}

export function TaskInspector({ task, updateTask }: TaskInspectorProps) {
    return (
        <>
            <div className="inspector-row">
                <div className="inspector-field">
                    <label htmlFor={`status-${task.id}`}>Status</label>
                    <TaskStatusSelect
                        value={task.status || "todo"}
                        onChange={(e) =>
                            updateTask(task.id, {
                                status: e.target.value,
                            })
                        }
                    />
                </div>
                <div className="inspector-field">
                    <label htmlFor={`priority-${task.id}`}>Priority</label>
                    <input
                        id={`priority-${task.id}`}
                        type="number"
                        min="0"
                        max={MAX_PRIORITY}
                        value={task.priority ?? 2}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateTask(task.id, {
                                priority: Math.max(
                                    0,
                                    Math.min(
                                        MAX_PRIORITY,
                                        parseInt(e.target.value) || 0,
                                    ),
                                ),
                            })
                        }
                    />
                </div>
            </div>

            <div className="inspector-field">
                <label htmlFor={`duration-${task.id}`}>Duration (min)</label>
                <input
                    id={`duration-${task.id}`}
                    type="number"
                    placeholder="Unset"
                    value={!task.est ? "" : task.est}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        let val = e.target.value ? parseInt(e.target.value) : 0;
                        if (val > MINUTES_IN_HOUR) val = MINUTES_IN_HOUR;
                        updateTask(task.id, { est: val });
                    }}
                />
            </div>
        </>
    );
}
