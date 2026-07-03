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

  // Data state (persisted)
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events, setEvents] = useStored('events', SAMPLE_EVENTS);

  // Seed store on first load & clean up empty items
  React.useEffect(() => { 
    seedDefaults(); 
    const validTasks = tasks.filter(t => t.title && t.title.trim() !== '');
    setTasks(validTasks);
    setEvents(es => es.filter(e => {
      if (e.taskId) return validTasks.some(t => t.id === e.taskId);
      return e.title && e.title.trim() !== '';
    }));
  }, [setTasks, setEvents, tasks]);

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

  // Inspector state
  const [inspectorState, setInspectorState] = React.useState(null); // { type: 'task', id } or { type: 'event', id }

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
      if (!active) {
        setInspectorState({ type: 'task', id: task.id });
      } else {
        const ds = dragRef.current;
        if (ds && ds.target) {
          if (ds.target.kind === 'month-day') {
            createEvent(task, ds.target.date, 9 * 60, task.est || 60);
          } else if (ds.target.kind === 'day-time') {
            createEvent(task, ymd(TODAY), ds.target.minute, task.est || 60);
          }
        }
      }
      setDragState(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onEventDragStart = (e, eventToMove, task) => {
    e.preventDefault();
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    let active = false;

    const move = (ev) => {
      if (!active) {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (Math.hypot(dx, dy) < 5) return;
        active = true;
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = resolveDropTarget(el, ev.clientX, ev.clientY, task, eventToMove);
      setDragState({
        event: eventToMove,
        task,
        pointerX: ev.clientX,
        pointerY: ev.clientY,
        target,
      });
    };

    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!active) {
        setInspectorState({ type: 'event', id: eventToMove.id });
      } else {
        const ds = dragRef.current;
        if (ds && ds.target) {
          if (ds.target.kind === 'month-day') {
            setEvents(prev => prev.map(evnt => evnt.id === eventToMove.id ? { ...evnt, date: ds.target.date } : evnt));
          } else if (ds.target.kind === 'day-time') {
            const duration = eventToMove.end - eventToMove.start;
            setEvents(prev => prev.map(evnt => evnt.id === eventToMove.id ? { ...evnt, date: ymd(TODAY), start: ds.target.minute, end: ds.target.minute + duration } : evnt));
          }
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

  const onAddTask = () => {
    const id = `t${Date.now()}`;
    setTasks(ts => [{
       id, title: 'New Task', status: 'todo', priority: 'P2', tags: [], subtasks: [], est: 60, added: new Date().toISOString()
    }, ...ts]);
    setInspectorState({ type: 'task', id });
  };

  const onAddEvent = () => {
    const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEvents(es => [...es, {
       id,
       title: 'New Event',
       date: ymd(TODAY),
       start: 9 * 60,
       end: 10 * 60,
       type: 'meeting',
    }]);
    setInspectorState({ type: 'event', id });
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
          tasks={tasks} setTasks={setTasks}
          filter={filter} setFilter={setFilter}
          sort={sort} setSort={setSort}
          query={query} setQuery={setQuery}
          onDragStart={onTaskDragStart}
          activeDragId={dragState?.task?.id}
          onAddTask={onAddTask}
        />
        <div className="right-pane">
          <MonthCalendar
            view={view} setView={setView}
            anchor={anchor} setAnchor={setAnchor}
            events={events} tasks={tasks}
            today={TODAY}
            dragState={dragState}
            onEventDragStart={onEventDragStart}
            onAddEvent={onAddEvent}
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
            onEventClick={(ev) => setInspectorState({ type: 'event', id: ev.id })}
            onAddEvent={onAddEvent}
          />
        </div>
      </main>

      <InspectorPane 
        inspectorState={inspectorState} 
        onClose={() => setInspectorState(null)} 
        tasks={tasks} setTasks={setTasks} 
        events={events} setEvents={setEvents} 
      />

      {(dragState && (dragState.task || dragState.event)) && (
        <DragGhost
          task={dragState.task}
          event={dragState.event}
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

function DragGhost({ task, event, x, y, style }) {
  const title = task ? task.title : (event ? event.title : '');
  const pri = task ? task.priority : null;
  const est = task ? task.est : (event ? event.end - event.start : 60);

  return (
    <div
      className={`drag-ghost is-${style}`}
      style={{ left: x + 14, top: y - 8 }}
    >
      <div className="drag-ghost-inner">
        {pri && <span className={`pri pri-${pri}`}>●</span>}
        {pri && <span className="drag-ghost-pri">{pri}</span>}
        <span className="drag-ghost-title">{title}</span>
      </div>
      <div className="drag-ghost-meta">
        <span className="bracket">└</span> {durationLabel(est)} block
      </div>
    </div>
  );
}

function resolveDropTarget(el, x, y, task, event) {
  if (!el) return null;
  // Day calendar grid
  const grid = el.closest('[data-drop-kind="day-time"]');
  if (grid) {
    const rect = grid.getBoundingClientRect();
    const offsetY = y - rect.top;
    const rawMin = offsetY / PX_PER_MIN;
    const snapped = Math.max(0, Math.min(24 * 60 - SNAP_MIN, Math.round(rawMin / SNAP_MIN) * SNAP_MIN));
    return { kind: 'day-time', minute: snapped, duration: task?.est || (event ? event.end - event.start : 60) };
  }
  // Month/week day cell
  const day = el.closest('[data-drop-kind="month-day"]');
  if (day) {
    return { kind: 'month-day', date: day.dataset.dropDate };
  }
  return null;
}

function InspectorPane({ inspectorState, onClose, tasks, setTasks, events, setEvents }) {
  if (!inspectorState) return null;
  const isTask = inspectorState.type === 'task';
  const item = isTask 
    ? tasks.find(t => t.id === inspectorState.id)
    : events.find(e => e.id === inspectorState.id);
  
  if (!item) return null;

  const title = isTask ? item.title : (item.taskId ? tasks.find(t => t.id === item.taskId)?.title : item.title);

  const updateTask = (id, updates) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const updateEvent = (id, updates) => setEvents(es => es.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEvent = (id) => setEvents(es => es.filter(e => e.id !== id));

  return (
    <div className="inspector-pane">
      <div className="inspector-hd">
        <div className="inspector-title">{isTask ? 'TASK DETAILS' : 'EVENT DETAILS'}</div>
        <button className="inspector-close" onClick={onClose}>×</button>
      </div>
      <div className="inspector-body">
         <div className="inspector-field">
            <label>Title</label>
            <input 
              value={title || ''} 
              onChange={e => {
                if (isTask) updateTask(item.id, { title: e.target.value });
                else updateEvent(item.id, { title: e.target.value });
              }}
              disabled={!isTask && item.taskId}
            />
         </div>
         {isTask && (
           <>
             <div className="inspector-field">
               <label>Status</label>
               <select value={item.status} onChange={e => updateTask(item.id, { status: e.target.value })}>
                 <option value="todo">todo</option>
                 <option value="next-up">next up</option>
                 <option value="doing">doing</option>
                 <option value="done">done</option>
               </select>
             </div>
             <div className="inspector-field">
               <label>Priority</label>
               <select value={item.priority} onChange={e => updateTask(item.id, { priority: e.target.value })}>
                 <option value="P0">P0</option>
                 <option value="P1">P1</option>
                 <option value="P2">P2</option>
                 <option value="P3">P3</option>
               </select>
             </div>
           </>
         )}
         {!isTask && (
           <>
             <div className="inspector-field">
               <label>Date</label>
               <input type="date" value={item.date} onChange={e => updateEvent(item.id, { date: e.target.value })} />
             </div>
           </>
         )}
         <div className="inspector-actions">
           <button onClick={() => {
             if (isTask) {
               deleteTask(item.id);
               // Also delete associated events
               setEvents(es => es.filter(e => e.taskId !== item.id));
             } else {
               deleteEvent(item.id);
             }
             onClose();
           }}>Delete {isTask ? 'Task' : 'Event'}</button>
         </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
