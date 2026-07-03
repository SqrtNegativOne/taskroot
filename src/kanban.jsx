// Kanban board — pulls tasks from the shared store, drag between columns to change status.

const KANBAN_COLUMNS = [
  { id: 'todo',    label: 'todo',     dim: false },
  { id: 'next-up', label: 'next up',  dim: false },
  { id: 'doing',   label: 'active',   accent: true },
  { id: 'done',    label: 'done',     dim: true },
];

function Kanban() {
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [drag, setDrag] = React.useState(null); // { taskId, x, y, overCol }

  const onTaskDown = (task) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let active = false;
    const move = (ev) => {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
      active = true;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const colEl = el?.closest('[data-kanban-col]');
      setDrag({ taskId: task.id, x: ev.clientX, y: ev.clientY, overCol: colEl?.dataset.kanbanCol || null });
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (active) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const colEl = el?.closest('[data-kanban-col]');
        if (colEl && colEl.dataset.kanbanCol !== task.status) {
          setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: colEl.dataset.kanbanCol } : t));
        }
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="kanban">
      <div className="kanban-cols">
        {KANBAN_COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const isOver = drag?.overCol === col.id;
          return (
            <div
              key={col.id}
              data-kanban-col={col.id}
              className={`kanban-col ${col.accent ? 'is-accent' : ''} ${col.dim ? 'is-dim' : ''} ${isOver ? 'is-drag-over' : ''}`}
            >
              <header className="kanban-col-hd">
                <span className="bracket">{col.accent ? '▸' : '◇'}</span>
                <span className="kanban-col-name">{col.label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </header>
              <div className="kanban-col-body">
                {colTasks.length === 0 ? (
                  <div className="kanban-col-empty">
                    <span className="dim">{isOver ? '▸ drop here' : '—'}</span>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onPointerDown={onTaskDown(task)}
                      dragging={drag?.taskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {drag && (
        <div className="kanban-ghost" style={{ left: drag.x + 12, top: drag.y - 6 }}>
          <span className={`pri pri-${tasks.find(t => t.id === drag.taskId)?.priority}`}>●</span>
          <span className="kanban-ghost-title">{tasks.find(t => t.id === drag.taskId)?.title}</span>
        </div>
      )}
    </div>
  );
}

function KanbanCard({ task, onPointerDown, dragging }) {
  return (
    <div
      className={`kanban-card ${dragging ? 'is-dragging' : ''}`}
      onPointerDown={onPointerDown}
    >
      <div className="kanban-card-line1">
        <span className={`pri pri-${task.priority}`}>●</span>
        <span className="kanban-card-pri">{task.priority}</span>
        <span className="kanban-card-title">{task.title}</span>
      </div>
      <div className="kanban-card-line2">
        <span className="meta-est">{durationLabel(task.est)}</span>
        {task.tags.length > 0 && (
          <>
            <span className="meta-sep">·</span>
            <span className="meta-tag">#{task.tags[0]}</span>
            {task.tags.length > 1 && <span className="dim">+{task.tags.length - 1}</span>}
          </>
        )}
        {task.subtasks.length > 0 && (
          <>
            <span className="meta-sep">·</span>
            <span className="meta-subtasks">☐{task.subtasks.filter(s => s.done).length}/{task.subtasks.length}</span>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Kanban });
