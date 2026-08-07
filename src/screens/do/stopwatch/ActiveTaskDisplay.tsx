export function ActiveTaskDisplay({
    activeTask,
    setSelectorOpen,
}: {
    activeTask?: { title: string };
    setSelectorOpen: (open: boolean) => void;
}) {
    if (activeTask) {
        return (
            <button
                type="button"
                aria-label="Open task selector"
                className="active-task-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectorOpen(true);
                }}
                title="Click to change task"
            >
                <span className="active-task-label">
                    Working on:
                </span>
                <span className="active-task-title">{activeTask.title}</span>
            </button>
        );
    }
    return (
        <div className="no-active-task">
            No active task.
        </div>
    );
}
