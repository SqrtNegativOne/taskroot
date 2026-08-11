import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React from "react";
import { type AppTask, isAppTaskStatus, isYmdString, editing } from "../../core/domain/models";
import { TaskStatusSelect } from "./inspector-shared";

const MAX_PRIORITY = 4;

interface TaskInspectorProps {
    task: AppTask;
    updateTask: (id: string, transform: (task: AppTask) => AppTask) => void;
}

export function TaskInspector({ task, updateTask }: TaskInspectorProps) {
    return (
        <>
            <div className="inspector-row">
                <div className="inspector-field">
                    <label htmlFor={`status-${task.id}`}>Status</label>
                    <TaskStatusSelect
                        value={task.status || "todo"}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (isAppTaskStatus(val)) {
                                updateTask(task.id, t => editing(t).set('status', val).done());
                            }
                        }}
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
                            updateTask(task.id, t => editing(t).set('priority', Math.max(
                                0,
                                Math.min(
                                    MAX_PRIORITY,
                                    parseInt(e.target.value) || 0,
                                ),
                            )).done())
                        }
                    />
                </div>
            </div>

            <div className="inspector-field">
                <label htmlFor={`due-${task.id}`}>Due Date</label>
                <input
                    id={`due-${task.id}`}
                    className="inspector-date-input"
                    type="date"
                    value={task.due ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        if (isYmdString(raw)) {
                            updateTask(task.id, t => editing(t).set('due', raw).done());
                        } else {
                            updateTask(task.id, t => editing(t).clear('due').done());
                        }
                    }}
                />
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
                        updateTask(task.id, t => editing(t).set('est', val).done());
                    }}
                />
            </div>
        </>
    );
}
