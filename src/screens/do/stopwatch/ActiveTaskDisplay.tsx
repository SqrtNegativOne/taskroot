export function ActiveTaskDisplay({
    settings,
    state,
    activeTask,
    running,
    allowNoTask,
    setSelectorOpen,
}: any) {
    const isGuzey = settings.clockStyle === "guzey";
    const isFlowBreak = state.isBreak;
    const shouldShowTask = activeTask && (running || isGuzey || isFlowBreak);

    if (shouldShowTask) {
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
    } else if (
        allowNoTask &&
        !activeTask &&
        (running || isGuzey || isFlowBreak)
    ) {
        return (
            <div className="no-active-task">
                No active task.
            </div>
        );
    }
    return null;
}
