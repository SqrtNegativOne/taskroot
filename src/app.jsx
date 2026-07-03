// Main app — layout, drag-and-drop orchestration, tweak state.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#e9b96e",
  "fontScale": 1,
  "showSubtaskCounts": true,
  "weekStart": "month",
  "ghostStyle": "bracket",
  "showCurrentTime": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Seed store on first load
  React.useEffect(() => { seedDefaults(); }, []);

  // Data state (persisted)
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events, setEvents] = useStored('events', SAMPLE_EVENTS);

  // UI state — task list
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState({ status: 'all', priority: 'all', tag: 'all' });
  const [sort, setSort] = React.useState('priority');

  // UI state — calendar
  const [view, setView] = React.useState('month');
  const [anchor, setAnchor] = React.useState(new Date(TODAY));

  // Drag state — { task, pointerX, pointerY, target }
  const [dragState, setDragState] = React.useState(null);
  const dragRef = React.useRef(null);
  dragRef.current = dragState;

  // Apply accent dynamically
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--font-scale', t.fontScale);
  }, [t.accent, t.fontScale]);

  const onTaskDragStart = (e, task) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let active = false;

    const move = (ev) => {
      if (!active) {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (Math.hypot(dx, dy) < 5) return;
        active = true;
      }
      // Hit test for drop target
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = resolveDropTarget(el, ev.clientX, ev.clientY, task);
      setDragState({
        task,
        pointerX: ev.clientX,
        pointerY: ev.clientY,
        target,
      });
    };

    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const ds = dragRef.current;
      if (active && ds && ds.target) {
        if (ds.target.kind === 'month-day') {
          // Schedule for that date — default 9am, est-length
          createEvent(task, ds.target.date, 9 * 60, task.est || 60);
        } else if (ds.target.kind === 'day-time') {
          createEvent(task, ymd(TODAY), ds.target.minute, task.est || 60);
        }
      }
      setDragState(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const createEvent = (task, date, start, duration) => {
    const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEvent = {
      id,
      taskId: task.id,
      date,
      start,
      end: Math.min(24 * 60, start + duration),
      type: 'plan',
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const onResizeEvent = (id, start, end) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, start, end } : e));
  };
  const onMoveEvent = (id, start, end) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, start, end } : e));
  };

  return (
    <div className="app">
      <TopBar today={TODAY} current="plan" />

      <main className="main">
        <TaskListPane
          tasks={tasks}
          filter={filter} setFilter={setFilter}
          sort={sort} setSort={setSort}
          query={query} setQuery={setQuery}
          onDragStart={onTaskDragStart}
          activeDragId={dragState?.task?.id}
        />
        <div className="right-pane">
          <MonthCalendar
            view={view} setView={setView}
            anchor={anchor} setAnchor={setAnchor}
            events={events} tasks={tasks}
            today={TODAY}
            dragState={dragState}
          />
          <div className="pane-sep">
            <span className="pane-sep-dots">··········································································</span>
          </div>
          <DayCalendar
            events={events} tasks={tasks}
            today={TODAY}
            dragState={dragState}
            setDragState={setDragState}
            onResizeEvent={onResizeEvent}
            onMoveEvent={onMoveEvent}
          />
        </div>
      </main>

      {dragState && dragState.task && (
        <DragGhost
          task={dragState.task}
          x={dragState.pointerX}
          y={dragState.pointerY}
          style={t.ghostStyle}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={['#e9b96e', '#c9a978', '#9eb39b', '#a8a4d2', '#d9866b']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSlider
          label="Font scale"
          value={t.fontScale}
          min={0.85} max={1.15} step={0.05}
          unit="×"
          onChange={(v) => setTweak('fontScale', v)}
        />

        <TweakSection label="Calendar" />
        <TweakRadio
          label="Default view"
          value={t.weekStart}
          options={[['month', 'month'], ['week', 'week']]}
          onChange={(v) => { setTweak('weekStart', v); setView(v); }}
        />
        <TweakToggle
          label="Show 'now' line"
          value={t.showCurrentTime}
          onChange={(v) => setTweak('showCurrentTime', v)}
        />

        <TweakSection label="Task list" />
        <TweakToggle
          label="Subtask counts"
          value={t.showSubtaskCounts}
          onChange={(v) => setTweak('showSubtaskCounts', v)}
        />

        <TweakSection label="Drag" />
        <TweakRadio
          label="Ghost style"
          value={t.ghostStyle}
          options={[['bracket', 'bracket'], ['solid', 'solid']]}
          onChange={(v) => setTweak('ghostStyle', v)}
        />
      </TweaksPanel>
    </div>
  );
}

function DragGhost({ task, x, y, style }) {
  return (
    <div
      className={`drag-ghost is-${style}`}
      style={{ left: x + 14, top: y - 8 }}
    >
      <div className="drag-ghost-inner">
        <span className={`pri pri-${task.priority}`}>●</span>
        <span className="drag-ghost-pri">{task.priority}</span>
        <span className="drag-ghost-title">{task.title}</span>
      </div>
      <div className="drag-ghost-meta">
        <span className="bracket">└</span> {durationLabel(task.est)} block
      </div>
    </div>
  );
}

// Hit-test: given the element under the pointer, work out what we'd drop into.
function resolveDropTarget(el, x, y, task) {
  if (!el) return null;
  // Day calendar grid
  const grid = el.closest('[data-drop-kind="day-time"]');
  if (grid) {
    const rect = grid.getBoundingClientRect();
    const offsetY = y - rect.top;
    const rawMin = offsetY / PX_PER_MIN;
    const snapped = Math.max(0, Math.min(24 * 60 - SNAP_MIN, Math.round(rawMin / SNAP_MIN) * SNAP_MIN));
    return { kind: 'day-time', minute: snapped, duration: task?.est || 60 };
  }
  // Month/week day cell
  const day = el.closest('[data-drop-kind="month-day"]');
  if (day) {
    return { kind: 'month-day', date: day.dataset.dropDate };
  }
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
