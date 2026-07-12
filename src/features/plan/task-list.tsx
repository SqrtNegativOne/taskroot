import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { TODAY, parseYMD, durationLabel, dueLabel } from '../../core/data';

// Task list — left column. Filter, sort, draggable items.

function TaskListPane({ tasks, setTasks, filter, setFilter, sort, setSort, query, setQuery, onDragStart, activeDragId, onAddTask }) {
  const updateTask = (id, updates) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const filtered = React.useMemo(() => {
    let xs = tasks;
    if (filter.status !== 'all') xs = xs.filter(t => t.status === filter.status);
    if (filter.priority !== 'all') xs = xs.filter(t => t.priority === filter.priority);
    if (filter.tag !== 'all') xs = xs.filter(t => t.tags.includes(filter.tag));
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(t => t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q)));
    }
    const cmp = {
      priority: (a, b) => a.priority.localeCompare(b.priority),
      due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      est: (a, b) => a.est - b.est,
      title: (a, b) => a.title.localeCompare(b.title),
      added: () => 0,
    }[sort] || (() => 0);
    return [...xs].sort(cmp);
  }, [tasks, filter, sort, query]);

  const allTags = React.useMemo(() => {
    const s = new Set();
    tasks.forEach(t => t.tags.forEach(tag => s.add(tag)));
    return ['all', ...[...s].sort()];
  }, [tasks]);

  return (
    <aside className="task-pane">
      <header className="task-pane-hd">
        <div className="task-pane-title">
          <span className="bracket">[</span>
          <span className="task-pane-title-label">TASKS</span>
          <span className="task-pane-title-count">· {filtered.length}/{tasks.length}</span>
          <span className="bracket">]</span>
        </div>
        <div className="task-pane-search">
          <span className="search-prompt">/</span>
          <input
            className="search-input"
            placeholder="filter by title or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="clear">×</button>
          )}
        </div>
        <div className="task-pane-controls">
          <Selector
            label="filter"
            value={filter.status}
            onChange={(v) => setFilter({ ...filter, status: v })}
            options={[['all','all'],['todo','todo'],['next-up','next-up'],['doing','doing'],['done','done']]}
          />
          <Selector
            label="priority"
            value={filter.priority}
            onChange={(v) => setFilter({ ...filter, priority: v })}
            options={[['all','all'],['P0','P0'],['P1','P1'],['P2','P2'],['P3','P3']]}
          />
          <Selector
            label="tag"
            value={filter.tag}
            onChange={(v) => setFilter({ ...filter, tag: v })}
            options={allTags.map(t => [t, t])}
          />
          <Selector
            label="sort"
            value={sort}
            onChange={setSort}
            options={[
              ['priority','priority'],
              ['due','due'],
              ['est','est'],
              ['title','title'],
              ['added','added'],
            ]}
          />
        </div>
      </header>

      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="task-empty">
            <span className="dim">no tasks match.</span>
          </div>
        ) : (
          filtered.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              index={i}
              onDragStart={onDragStart}
              dragging={activeDragId === t.id}
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          ))
        )}
      </div>

      <footer className="task-pane-ft" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="dim">drag a task → calendar to schedule it</span>
        <button 
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', padding: '2px 8px', fontSize: '0.9em' }}
          onClick={onAddTask}
        >+ Task</button>
      </footer>
    </aside>
  );
}

function Selector({ label, value, onChange, options }) {
  return (
    <label className="selector">
      <span className="selector-label">{label}:</span>
      <select
        className="selector-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span className="selector-caret">▾</span>
    </label>
  );
}

function TaskRow({ task, index, onDragStart, dragging, updateTask, deleteTask }) {
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.task-row-subtask-toggle') || e.target.closest('.task-row-actions')) return;
    onDragStart(e, task);
  };

  const dueStr = task.due ? dueLabel(task.due, TODAY) : '';
  const overdue = task.due && parseYMD(task.due) < TODAY && task.status !== 'done';

  return (
    <div
      className={`task-row ${dragging ? 'is-dragging' : ''} ${task.status === 'done' ? 'is-done' : ''}`}
      onPointerDown={handlePointerDown}
    >
      <div className="task-row-line1">
        <span className={`pri pri-${task.priority}`} aria-label={task.priority}>●</span>
        <span className="task-row-pri-label">{task.priority}</span>
        <span className="task-row-title">{task.title}</span>
        {task.status === 'doing' && <span className="status-pill status-doing">doing</span>}
        {task.status === 'next-up' && <span className="status-pill status-nextup">next up</span>}
        
        <div className="task-row-actions">
           <button onClick={(e) => {
             e.stopPropagation();
             updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
           }} title="Toggle Done">✔</button>
           <button onClick={(e) => {
             e.stopPropagation();
             if (e.shiftKey || confirm("Delete task?")) deleteTask(task.id);
           }} title="Delete">🗑</button>
        </div>
      </div>
      <div className="task-row-line2">
        <span className="meta-est">{durationLabel(task.est)}</span>
        <span className="meta-sep">·</span>
        {task.tags.map((tag, i) => (
          <React.Fragment key={tag}>
            <span className="meta-tag">#{tag}</span>
            {i < task.tags.length - 1 && <span className="meta-tag-sep">,</span>}
          </React.Fragment>
        ))}
        <span className="meta-spacer" />
        {task.subtasks.length > 0 && (
          <span className="meta-subtasks" title={`${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} subtasks done`}>
            ☐{task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
          </span>
        )}
        {dueStr && (
          <span className={`meta-due ${overdue ? 'is-overdue' : ''}`}>
            due {dueStr}
          </span>
        )}
      </div>
    </div>
  );
}

export { TaskListPane };
