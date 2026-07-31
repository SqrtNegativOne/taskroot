import React from "react";
import type { AppTask } from "../../../core/domain/models";

interface UseTaskSelectorKeyboardProps {
    sortedTasks: AppTask[];
    selectedIndex: number;
    setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
    setSearchQuery: (query: string) => void;
    startWithTask: (taskId: string) => void;
}

export function useTaskSelectorKeyboard({
    sortedTasks,
    selectedIndex,
    setSelectedIndex,
    setSearchQuery,
    startWithTask,
}: UseTaskSelectorKeyboardProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && sortedTasks.length > 0) {
            startWithTask(sortedTasks[selectedIndex]?.id || sortedTasks[0].id);
        } else if (e.key === "Escape") {
            setSearchQuery("");
            e.stopPropagation();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (sortedTasks.length > 0) {
                setSelectedIndex((prev) => (prev + 1) % sortedTasks.length);
                import("cuelume").then(({ play }) => play("tick"));
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (sortedTasks.length > 0) {
                setSelectedIndex((prev) => (prev - 1 + sortedTasks.length) % sortedTasks.length);
                import("cuelume").then(({ play }) => play("tick"));
            }
        }
    };

    return handleKeyDown;
}
