import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { TODAY, SAMPLE_TASKS, SAMPLE_EVENTS, ymd, durationLabel } from '../../core/store/data';
import { DayTimeline, PX_PER_MIN, SNAP_MIN } from '../../components/day-timeline';
import { DateGrid } from './date-grid';
import { TitleBar } from '../../components/shell';
import { load, useStored, seedDefaults } from '../../core/store/store';
import { TaskListPane } from '../../components/tasklist';

import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakColor } from './tweaks-panel';
import { SplitPane } from '../../components/split-pane';
import { FilterSortButtons } from './shared-menus';
import { expandEventsForView } from '../../core/domain/rrule-utils';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "var(--tag-yellow)",
  "fontScale": 1,
  "showSubtaskCounts": true,
  "weekStart": "month",
  "ghostStyle": "bracket",
  "showCurrentTime": true
}/*EDITMODE-END*/;

export function PlanScreen() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Data state (persisted)
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events, setEvents] = useStored('events', SAMPLE_EVENTS);

  // Seed store on first load & clean up empty items
  React.useEffect(() => { 
    seedDefaults(); 
    const validTasks = tasks.filter(t => t.isDraft || (t.title && t.title.trim() !== ''));
    if (validTasks.length !== tasks.length) {
      setTasks(validTasks);
      setEvents(es => es.filter(e => {
        if (e.taskId) return validTasks.some(t => t.id === e.taskId);
        return e.isDraft || (e.title && e.title.trim() !== '');
      }));
    }
  }, [setTasks, setEvents, tasks]);

  // UI state — task list
  const [query, setQuery] = useStored('taskQuery', '');
  const [filters, setFilters] = useStored('taskFilters', [{ id: 'default-not-done', column: 'status', operator: 'is not', value: 'done' }]);
  const [sort, setSort] = useStored('taskSort', 'priority');

  // UI state — calendar
  const [settings] = useStored('settings', { defaultCalendarView: 'month', defaultTaskDuration: 0 });
  const [view, setView] = React.useState(settings.defaultCalendarView || 'month');
  const [anchor, setAnchor] = React.useState(new Date(TODAY));
  const [timelineDate, setTimelineDate] = React.useState(new Date(TODAY));

  // Event filters
  const [calFilter, setCalFilter] = useStored('calFilters', []);
  const [calSort, setCalSort] = useStored('calSort', 'time');
  const [timeFilter, setTimeFilter] = useStored('timeFilters', []);
  const [timeSort, setTimeSort] = useStored('timeSort', 'time');

  const allEventTags = React.useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks]);

  const visibleEvents = React.useMemo(() => {
    const start = new Date(anchor);
    start.setMonth(start.getMonth() - 2);
    const end = new Date(anchor);
    end.setMonth(end.getMonth() + 2);
    return expandEventsForView(events, start, end);
  }, [events, anchor]);

  const getEventFilterValues = React.useCallback((col) => {
    if (col === 'type') return ['info', 'plan', 'busy', 'log'];
    if (col === 'tag') return allEventTags;
    if (col === 'taskStatus') return ['todo', 'done', 'none'];
    if (col === 'category') {
      const s = new Set<string>();
      events.forEach(e => { if (e.category) s.add(e.category); });
      return Array.from(s).sort();
    }
    return [];
  }, [allEventTags, events]);

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
      const target = resolveDropTarget(el, ev.clientX, ev.clientY, task, undefined);
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
          if (ds.target.kind === 'grid-day') {
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
          if (ds.target.kind === 'grid-day') {
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

  const onAddTask = (defaults: any = {}) => {
    const id = `t${Date.now()}`;
    setTasks(ts => [{
       id, title: '', status: 'todo', priority: 1, tags: [], subtasks: [], parent_task: null, dependency: null, est: (settings.defaultTaskDuration === 0 || settings.defaultTaskDuration === undefined) ? 0 : settings.defaultTaskDuration, added: new Date().toISOString(), isDraft: true, ...defaults
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
       title: '',
       date: ymd(d),
       endDate: ymd(d),
       start,
       end,
       type: isAllDay ? 'info' : 'busy',
       isAllDay,
       isDraft: true
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

      <main className="main" style={{ position: 'relative' }}>
        <SplitPane direction="horizontal" defaultSize={360} minSize={200} snapThreshold={50}>
          <TaskListPane
            tasks={tasks} setTasks={setTasks}
            filters={filters} setFilters={setFilters}
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
              <DateGrid
                view={view} setView={setView}
                anchor={anchor} setAnchor={setAnchor}
                events={visibleEvents} tasks={tasks}
                filter={calFilter}
                sort={calSort}
                filterMenu={
                  <FilterSortButtons
                    filters={calFilter} setFilters={setCalFilter}
                    sort={calSort} setSort={setCalSort}
                    columns={[
                      { id: 'type', label: 'Type' },
                      { id: 'tag', label: 'Tag' },
                      { id: 'taskStatus', label: 'Task Status' },
                      { id: 'category', label: 'Category' }
                    ]}
                    getValuesForColumn={getEventFilterValues}
                    sortOptions={[
                      { id: 'time', label: 'Time' },
                      { id: 'taskStatus', label: 'Task Completed' }
                    ]}
                    align="right"
                  />
                }
                today={TODAY}
                dragState={dragState}
                onEventDragStart={onEventDragStart}
                onAddEvent={onAddEvent}
                onDropToDate={() => {}}
              />
              <DayTimeline
                events={visibleEvents} tasks={tasks}
                filter={timeFilter}
                sort={timeSort}
                filterMenu={
                  <FilterSortButtons
                    filters={timeFilter} setFilters={setTimeFilter}
                    sort={timeSort} setSort={setTimeSort}
                    columns={[
                      { id: 'type', label: 'Type' },
                      { id: 'tag', label: 'Tag' },
                      { id: 'taskStatus', label: 'Task Status' },
                      { id: 'category', label: 'Category' }
                    ]}
                    getValuesForColumn={getEventFilterValues}
                    sortOptions={[
                      { id: 'time', label: 'Time' },
                      { id: 'taskStatus', label: 'Task Completed' }
                    ]}
                    align="right"
                  />
                }
                today={TODAY}
                timelineDate={timelineDate}
                setTimelineDate={setTimelineDate}
                dragState={dragState}
                setDragState={setDragState}
                onResizeEvent={onResizeEvent}
                onMoveEvent={onMoveEvent}
                onEventClick={(ev) => setInspectorState({ type: 'event', id: ev.id })}
                onAddEvent={onAddEvent}
                onDropToTime={() => {}}
              />
            </SplitPane>
          </div>
        </SplitPane>

        <InspectorPane 
          inspectorState={inspectorState} 
          onClose={() => setInspectorState(null)} 
          tasks={tasks} setTasks={setTasks} 
          events={events} setEvents={setEvents}
          allTags={allEventTags}
          settings={settings}
        />
      </main>

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
        {pri !== null && pri !== undefined && <div className={`task-circle pri-bg-${pri}`} aria-label={String(pri)} />}
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
  // Date grid day cell
  const day = el.closest('[data-drop-kind="grid-day"]');
  if (day) {
    return { kind: 'grid-day', date: day.dataset.dropDate };
  }
  return null;
}

interface TitleInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  onEnter?: () => void;
  style?: React.CSSProperties;
  className?: string;
  autoFocus?: boolean;
}
function TitleInput({ value, onChange, disabled, onEnter, style = {}, className = '', autoFocus = false }: TitleInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  const handleBlur = () => {
    if (localValue !== value) onChange(localValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
      if (onEnter) onEnter();
    }
  };

  return (
    <input 
      ref={inputRef}
      value={localValue || ''}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      style={style}
      className={className}
      spellCheck={false}
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

function TagsInput({ tags, allTags, onChange }) {
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const addTag = (tagStr) => {
    const t = tagStr.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInputValue('');
  };

  const removeTag = (t) => {
    onChange(tags.filter(x => x !== t));
  };

  const suggestions = allTags.filter(t => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t));

  return (
    <div className="tags-input-container">
      {tags.map(t => (
        <span key={t} className="tag-chip">
          {t} <button type="button" onClick={() => removeTag(t)}>×</button>
        </span>
      ))}
      <div style={{ position: 'relative', flex: 1 }}>
        <input 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? "Add tags..." : ""}
        />
        {showSuggestions && inputValue && suggestions.length > 0 && (
          <div className="tags-suggestions">
            {suggestions.map(s => (
              <div key={s} onMouseDown={(e) => { e.preventDefault(); addTag(s); }} className="tag-suggestion">{s}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onChange(!checked)}>
      <div className={`toggle-switch ${checked ? 'is-on' : ''}`}>
        <div className="toggle-switch-thumb" />
      </div>
      <span style={{ fontSize: '0.9em' }}>{label}</span>
    </div>
  );
}

function DescriptionInput({ value, onChange }) {
  const [editing, setEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => { setLocalValue(value); }, [value]);

  if (!editing) {
    return (
      <div 
        onClick={() => setEditing(true)} 
        style={{ minHeight: '24px', cursor: 'text', padding: '0', color: value ? 'var(--fg)' : 'var(--fg-dim)', borderRadius: '4px' }}
      >
        {value || 'Add description...'}
      </div>
    );
  }

  return (
    <textarea 
      autoFocus
      value={localValue || ''}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => { setEditing(false); if(localValue !== value) onChange(localValue); }}
      rows={5}
      style={{ width: '100%', resize: 'vertical', padding: '4px', fontFamily: 'inherit', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--fg)', borderRadius: '4px' }}
      placeholder="Add a description..."
      spellCheck={false}
    />
  );
}

function InspectorPane({ inspectorState, onClose, tasks, setTasks, events, setEvents, allTags, settings }) {
  const [activeState, setActiveState] = React.useState(null);
  const paneRef = React.useRef(null);
  const [calendars] = useStored('calendars', [{ id: 'primary', summary: 'Primary Calendar' }]);

  React.useEffect(() => {
    if (inspectorState) setActiveState(inspectorState);
  }, [inspectorState]);

  const currentState = inspectorState || activeState;
  
  const isCurrentTask = currentState?.type === 'task';
  const currentItem = currentState 
    ? (isCurrentTask 
      ? tasks.find(t => t.id === currentState.id)
      : events.find(e => e.id === currentState.id) || events.find(e => e.id === currentState.id.split('_')[0]))
    : null;

  const [showEndDate, setShowEndDate] = React.useState(false);
  React.useEffect(() => {
    if (currentItem?.type !== 'task' && currentItem?.endDate && currentItem?.date && currentItem.endDate !== currentItem.date) {
      setShowEndDate(true);
    } else {
      setShowEndDate(false);
    }
  }, [currentItem?.id]);

  const handleClose = React.useCallback(() => {
    if (!(inspectorState && currentItem && currentItem.isDraft)) {
      onClose();
      return;
    }
    
    if (isCurrentTask) {
      setTasks(ts => {
        const t = ts.find(x => x.id === currentItem.id);
        if (t && t.isDraft) {
          setEvents(es => es.filter(e => e.taskId !== currentItem.id));
          return ts.filter(x => x.id !== currentItem.id);
        }
        return ts;
      });
    } else {
      setEvents(es => {
        const e = es.find(x => x.id === currentItem.id);
        if (e && e.isDraft) return es.filter(x => x.id !== currentItem.id);
        return es;
      });
    }
    
    onClose();
  }, [inspectorState, currentItem, isCurrentTask, setTasks, setEvents, onClose]);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (inspectorState && paneRef.current && !paneRef.current.contains(e.target)) {
        handleClose();
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [inspectorState, handleClose]);



  const isOpen = !!(inspectorState && currentItem);
  
  const title = currentItem ? (isCurrentTask ? currentItem.title : (currentItem.taskId ? tasks.find(t => t.id === currentItem.taskId)?.title : currentItem.title)) : '';

  const updateTask = (id, updates) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates, isDraft: false } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const updateEvent = (id, updates) => setEvents(es => es.map(e => e.id === id ? { ...e, ...updates, isDraft: false } : e));
  const deleteEvent = (id) => setEvents(es => es.filter(e => e.id !== id));

  return (
    <div ref={paneRef} className={`inspector-pane ${isOpen ? 'is-open' : ''}`}>
      {currentItem && (
        <React.Fragment key={currentItem.id}>
          <div className="inspector-hd" style={{ padding: '0 8px', borderBottom: 'none', background: 'transparent' }}>
            <button className="inspector-icon-btn" onClick={handleClose} title="Close Pane">
              <span className="material-symbols-outlined">keyboard_double_arrow_right</span>
            </button>
            <button className="inspector-icon-btn" onClick={() => {
              if (isCurrentTask) {
                deleteTask(currentItem.id);
                setEvents(es => es.filter(e => e.taskId !== currentItem.id));
              } else {
                deleteEvent(currentItem.id);
              }
              handleClose();
            }} title="Delete"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span></button>
          </div>
          <div className="inspector-body" style={{ paddingTop: 0 }}>
             <div className="inspector-field" style={{ marginTop: '24px', marginBottom: '4px' }}>
                <TitleInput 
                  value={title || ''} 
                  onChange={newTitle => {
                    if (isCurrentTask) updateTask(currentItem.id, { title: newTitle });
                    else updateEvent(currentItem.id, { title: newTitle });
                  }}
                  disabled={!isCurrentTask && currentItem.taskId}
                  onEnter={handleClose}
                  style={{ fontSize: '24px', fontWeight: 'normal', border: 'none', background: 'transparent', padding: '0', outline: 'none', width: '100%', color: 'var(--fg)' }}
                  autoFocus={currentItem.isDraft}
                />
             </div>
             <div className="inspector-field" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <DescriptionInput 
                  value={currentItem.description || ''} 
                  onChange={desc => {
                    if (isCurrentTask) updateTask(currentItem.id, { description: desc });
                    else updateEvent(currentItem.id, { description: desc });
                  }} 
                />
             </div>
             
             {isCurrentTask && (
               <>
                 <div className="inspector-row">
                   <div className="inspector-field">
                     <label>Status</label>
                     <select value={currentItem.status} onChange={e => updateTask(currentItem.id, { status: e.target.value })}>
                       <option value="todo">todo</option>
                       <option value="next-up">next up</option>
                       <option value="doing">doing</option>
                       <option value="done">done</option>
                     </select>
                   </div>
                   <div className="inspector-field">
                     <label>Priority</label>
                     <input type="number" min="0" max="4" value={currentItem.priority ?? 2} onChange={e => updateTask(currentItem.id, { priority: Math.max(0, Math.min(4, parseInt(e.target.value) || 0)) })} />
                   </div>
                 </div>
                 
                 <div className="inspector-field">
                   <label>Duration (min)</label>
                   <input type="number" placeholder="Unset" value={!currentItem.est ? '' : currentItem.est} onChange={e => {
                     let val = e.target.value ? parseInt(e.target.value) : 0;
                     if (val > 60) val = 60;
                     updateTask(currentItem.id, { est: val });
                   }} />
                 </div>
               </>
             )}
             
             {!isCurrentTask && (
               <>
                 <div className="inspector-field" style={{ marginTop: '8px' }}>
                   <select value={currentItem.type} onChange={e => {
                     const type = e.target.value;
                     if (type === 'plan') {
                       updateEvent(currentItem.id, { type });
                     } else {
                       updateEvent(currentItem.id, { type, taskId: undefined });
                     }
                   }}>
                     <option value="busy">Busy</option>
                     <option value="info">Informational</option>
                     <option value="plan">Plan (task-based)</option>
                   </select>
                 </div>
                 
                 {currentItem.type === 'plan' && (
                   <div className="inspector-field">
                     <select value={currentItem.taskId || ''} onChange={e => {
                       const taskId = e.target.value;
                       updateEvent(currentItem.id, { taskId: taskId || undefined });
                     }}>
                       <option value="">-- No task attached --</option>
                       {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                     </select>
                   </div>
                 )}

                 <div className="inspector-field" style={{ marginTop: '8px' }}>
                    <label>Calendar</label>
                    <select 
                      value={currentItem.googleCalendarId || 'primary'}
                      onChange={e => {
                        const cal = calendars.find(c => c.id === e.target.value);
                        updateEvent(currentItem.id, { 
                          googleCalendarId: e.target.value,
                          category: cal ? cal.summary : ''
                        });
                      }}
                    >
                      {calendars.map(c => (
                        <option key={c.id} value={c.id}>{c.summary}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="inspector-field" style={{ marginTop: '8px' }}>
                    <label>Repeat (RRULE)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                      <select value={currentItem.rrule || ''} onChange={e => updateEvent(currentItem.id, { rrule: e.target.value || undefined })}>
                        <option value="">None</option>
                        <option value="FREQ=DAILY">Daily</option>
                        <option value="FREQ=WEEKLY">Weekly</option>
                        <option value="FREQ=MONTHLY">Monthly</option>
                        <option value="FREQ=YEARLY">Yearly</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Custom RRULE (e.g. FREQ=WEEKLY;BYDAY=TU,TH)" 
                        value={currentItem.rrule || ''} 
                        onChange={e => updateEvent(currentItem.id, { rrule: e.target.value || undefined })} 
                      />
                    </div>
                  </div>

                 <div className="inspector-field" style={{ gap: '20px', padding: '8px 0', flexDirection: 'row' }}>
                   <Toggle 
                     label="End date"
                     checked={showEndDate}
                     onChange={checked => {
                       setShowEndDate(checked);
                       if (!checked) updateEvent(currentItem.id, { endDate: currentItem.date });
                     }} 
                   />
                   <Toggle 
                     label="Include time"
                     checked={!currentItem.isAllDay}
                     onChange={checked => {
                       const updates: any = { isAllDay: !checked };
                       if (currentItem.type !== 'plan') updates.type = !checked ? 'busy' : 'info';
                       updateEvent(currentItem.id, updates);
                     }} 
                   />
                 </div>

                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                     <input type="date" className="inspector-date-input" value={currentItem.date} onChange={e => updateEvent(currentItem.id, { date: e.target.value })} />
                     {!currentItem.isAllDay && (
                       <input type="time" className="inspector-date-input" value={minToTime(currentItem.start)} onChange={e => updateEvent(currentItem.id, { start: timeToMin(e.target.value) })} />
                     )}
                   </div>

                   {showEndDate && (
                     <div style={{ color: 'var(--fg-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span className="material-symbols-outlined">arrow_forward</span>
                     </div>
                   )}

                   {showEndDate && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                       <input type="date" className="inspector-date-input" value={currentItem.endDate || currentItem.date} min={currentItem.date} onChange={e => updateEvent(currentItem.id, { endDate: e.target.value })} />
                       {!currentItem.isAllDay && (
                         <input type="time" className="inspector-date-input" value={minToTime(currentItem.end)} onChange={e => updateEvent(currentItem.id, { end: timeToMin(e.target.value) })} />
                       )}
                     </div>
                   )}
                 </div>
               </>
             )}
           </div>
        </React.Fragment>
      )}
    </div>
  );
}




