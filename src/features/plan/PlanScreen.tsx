// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
// @ts-nocheck
import { TODAY, SAMPLE_TASKS, SAMPLE_EVENTS, ymd, durationLabel } from '../../core/data';
// @ts-nocheck
import { DayTimeline, PX_PER_MIN, SNAP_MIN } from './day-cal';
// @ts-nocheck
import { MonthCalendar } from './month-cal';
// @ts-nocheck
import { TitleBar } from '../../components/shell';
// @ts-nocheck
import { load, useStored, seedDefaults } from '../../core/store';
// @ts-nocheck
import { TaskListPane } from './task-list';
// @ts-nocheck
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakColor } from './tweaks-panel';
import { SplitPane } from '../../components/split-pane';

// Main app — layout, drag-and-drop orchestration, tweak state.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "var(--tag-yellow)",
  "fontScale": 1,
  "showSubtaskCounts": true,
  "weekStart": "month",
  "ghostStyle": "bracket",
  "showCurrentTime": true
}/*EDITMODE-END*/;

function PlanScreen() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Data state (persisted)
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events, setEvents] = useStored('events', SAMPLE_EVENTS);

  // Seed store on first load & clean up empty items
  React.useEffect(() => { 
    seedDefaults(); 
    const validTasks = tasks.filter(t => t.title && t.title.trim() !== '');
    if (validTasks.length !== tasks.length) {
      setTasks(validTasks);
      setEvents(es => es.filter(e => {
        if (e.taskId) return validTasks.some(t => t.id === e.taskId);
        return e.title && e.title.trim() !== '';
      }));
    }
  }, [setTasks, setEvents, tasks]);

  // UI state — task list
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState({ status: 'all', priority: 'all', tag: 'all' });
  const [sort, setSort] = React.useState('priority');

  // UI state — calendar
  const [view, setView] = React.useState('month');
  const [anchor, setAnchor] = React.useState(new Date(TODAY));
  const [timelineDate, setTimelineDate] = React.useState(new Date(TODAY));

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
            createEvent(task, ds.target.date, 9 * 60, task.est || 60, true);
          } else if (ds.target.kind === 'day-time') {
            createEvent(task, ymd(timelineDate), ds.target.minute, task.est || 60, false);
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
            setEvents(prev => prev.map(evnt => evnt.id === eventToMove.id ? { ...evnt, date: ds.target.date, endDate: ds.target.date } : evnt));
          } else if (ds.target.kind === 'day-time') {
            const duration = eventToMove.end - eventToMove.start;
            setEvents(prev => prev.map(evnt => evnt.id === eventToMove.id ? { ...evnt, date: ymd(timelineDate), endDate: ymd(timelineDate), start: ds.target.minute, end: ds.target.minute + duration, isAllDay: false } : evnt));
          }
        }
      }
      setDragState(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const createEvent = (task, date, start, duration, isAllDay = false) => {
    const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEvent = {
      id,
      taskId: task.id,
      date,
      endDate: date,
      start,
      end: Math.min(24 * 60, start + duration),
      type: 'plan',
      isAllDay
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

  const onAddEvent = (dateArg, startArg, endArg) => {
    const d = (dateArg instanceof Date) ? dateArg : timelineDate;
    const isAllDay = typeof startArg !== 'number';
    const start = typeof startArg === 'number' ? startArg : 9 * 60;
    const end = typeof endArg === 'number' ? endArg : start + 60;
    const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEvents(es => [...es, {
       id,
       title: 'New Event',
       date: ymd(d),
       endDate: ymd(d),
       start,
       end,
       type: 'meeting',
       isAllDay
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
      <TitleBar today={TODAY} current="plan" />

      <main className="main">
        <SplitPane direction="horizontal" defaultSize={360} minSize={200} snapThreshold={50}>
          <TaskListPane
            tasks={tasks} setTasks={setTasks}
            filter={filter} setFilter={setFilter}
            sort={sort} setSort={setSort}
            query={query} setQuery={setQuery}
            onDragStart={onTaskDragStart}
            activeDragId={dragState?.task?.id}
            onAddTask={onAddTask}
            onDeleteTask={(id) => {
              setTasks(ts => ts.filter(t => t.id !== id));
              setEvents(es => es.filter(e => e.taskId !== id));
            }}
          />
          <div className="right-pane">
            <SplitPane direction="vertical" defaultSize={450} minSize={150} snapThreshold={60}>
              <MonthCalendar
                view={view} setView={setView}
                anchor={anchor} setAnchor={setAnchor}
                events={events} tasks={tasks}
                today={TODAY}
                dragState={dragState}
                onEventDragStart={onEventDragStart}
                onAddEvent={onAddEvent}
              />
              <DayTimeline
                events={events} tasks={tasks}
                today={TODAY}
                timelineDate={timelineDate}
                setTimelineDate={setTimelineDate}
                dragState={dragState}
                setDragState={setDragState}
                onResizeEvent={onResizeEvent}
                onMoveEvent={onMoveEvent}
                onEventClick={(ev) => setInspectorState({ type: 'event', id: ev.id })}
                onAddEvent={onAddEvent}
              />
            </SplitPane>
          </div>
        </SplitPane>
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
          options={['var(--tag-yellow)', 'var(--tag-gold)', '#9eb39b', 'var(--tag-purple)', '#d9866b']}
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

function TitleInput({ value, onChange, disabled }) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) onChange(localValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <input 
      value={localValue || ''}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    />
  );
}

function minToTime(m) {
  if (typeof m !== 'number' || isNaN(m)) return '';
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function timeToMin(t) {
  if (!t) return 0;
  const [hh, mm] = t.split(':');
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

function InspectorPane({ inspectorState, onClose, tasks, setTasks, events, setEvents }) {
  const [activeState, setActiveState] = React.useState(null);

  React.useEffect(() => {
    if (inspectorState) setActiveState(inspectorState);
  }, [inspectorState]);

  const currentState = inspectorState || activeState;
  
  const isTask = currentState?.type === 'task';
  const item = currentState 
    ? (isTask 
      ? tasks.find(t => t.id === currentState.id)
      : events.find(e => e.id === currentState.id))
    : null;

  const isOpen = !!(inspectorState && item);
  
  const title = item ? (isTask ? item.title : (item.taskId ? tasks.find(t => t.id === item.taskId)?.title : item.title)) : '';

  const updateTask = (id, updates) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const updateEvent = (id, updates) => setEvents(es => es.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEvent = (id) => setEvents(es => es.filter(e => e.id !== id));

  return (
    <div className={`inspector-pane ${isOpen ? 'is-open' : ''}`}>
      {item && (
        <>
          <div className="inspector-hd">
            <div className="inspector-title">{isTask ? 'TASK DETAILS' : 'EVENT DETAILS'}</div>
            <button className="inspector-close" onClick={onClose}>×</button>
          </div>
          <div className="inspector-body">
             <div className="inspector-field">
                <label>Title</label>
                <TitleInput 
                  value={title || ''} 
                  onChange={newTitle => {
                    if (isTask) updateTask(item.id, { title: newTitle });
                    else updateEvent(item.id, { title: newTitle });
                  }}
                  disabled={!isTask && item.taskId}
                />
             </div>
             <div className="inspector-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <label>Description</label>
                <textarea 
                  value={item.description || ''} 
                  onChange={e => {
                    if (isTask) updateTask(item.id, { description: e.target.value });
                    else updateEvent(item.id, { description: e.target.value });
                  }}
                  rows={5}
                  style={{ width: '100%', resize: 'vertical', padding: '6px', fontFamily: 'inherit', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--fg)', borderRadius: '4px' }}
                  placeholder="Add a description..."
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
                   <label>All Day</label>
                   <input type="checkbox" checked={!!item.isAllDay} onChange={e => updateEvent(item.id, { isAllDay: e.target.checked })} />
                 </div>
                 <div className="inspector-field">
                   <label>Start Date</label>
                   <input type="date" value={item.date} onChange={e => updateEvent(item.id, { date: e.target.value })} />
                 </div>
                 <div className="inspector-field">
                   <label>End Date</label>
                   <input type="date" value={item.endDate || item.date} min={item.date} onChange={e => updateEvent(item.id, { endDate: e.target.value })} />
                 </div>
                 {!item.isAllDay && (
                   <>
                     <div className="inspector-field">
                       <label>Start Time</label>
                       <input type="time" value={minToTime(item.start)} onChange={e => updateEvent(item.id, { start: timeToMin(e.target.value) })} />
                     </div>
                     <div className="inspector-field">
                       <label>End Time</label>
                       <input type="time" value={minToTime(item.end)} onChange={e => updateEvent(item.id, { end: timeToMin(e.target.value) })} />
                     </div>
                   </>
                 )}
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
        </>
      )}
    </div>
  );
}



export { PlanScreen };
