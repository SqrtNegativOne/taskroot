import type { AppTask } from "../../../core/domain/models";
import { TaskSelectorItem } from "./TaskSelectorItem";

export interface TaskSearchResultsProps {
    sortedTasks: AppTask[];
    startWithTask: (id: string) => void;
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
    updateTask: (id: string, transform: (task: AppTask) => AppTask) => void;
}

export function TaskSearchResults({
    sortedTasks,
    startWithTask,
    selectedIndex,
    setSelectedIndex,
    updateTask,
}: TaskSearchResultsProps) {
    if (sortedTasks.length === 0) {
        return <div className="task-selector-no-results">No tasks match your search.</div>;
    }

    return (
        <>
            {sortedTasks.map((t, idx) => (
                <TaskSelectorItem
                    key={t.id}
                    task={t}
                    idx={idx}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    startWithTask={startWithTask}
                    updateTask={updateTask}
                />
            ))}
        </>
    );
}
