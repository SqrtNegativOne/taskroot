import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import Fuse from 'fuse.js';
import { TODAY, parseYMD, durationLabel, dueLabel } from '../core/data';
import { Icon } from './icon';
import { SearchBar } from './search-bar';
import { FilterSortButtons } from '../screens/plan/shared-menus';

// Task list — left column. Filter, sort, draggable items.

function TaskListPane({ tasks = [], setTasks, filters = [], setFilters, sort, setSort, query = '', setQuery, onDragStart, activeDragId, onAddTask, onDeleteTask, footer }: any) {

  const updateTask = (id, updates) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id) => {
    if (onDeleteTask) {
      onDeleteTask(id);
    } else {
      setTasks(ts => ts.filter(t => t.id !== id));
    }
  };

  const allTags = React.useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks]);

  const filtered = React.useMemo(() => {
    let xs = tasks;
    for (const f of filters) {
      if (!f.column || !f.value) continue;
      xs = xs.filter(t => {
        let match = false;
        if (f.column === 'status') {
          match = t.status === f.value;
        } else if (f.column === 'priority') {
          match = t.priority === f.value;
        } else if (f.column === 'tag') {
          match = t.tags.includes(f.value);
        }
        return f.operator === 'is not' ? !match : match;
      });
    }
    if (query.trim()) {
      const fuse = new Fuse(xs, {
        keys: ['title', 'tags'],
        threshold: 0.4,
      });
      xs = fuse.search(query).map(result => result.item);
    }
    const cmp = {
      priority: (a, b) => a.priority.localeCompare(b.priority),
      due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      est: (a, b) => a.est - b.est,
      title: (a, b) => a.title.localeCompare(b.title),
      added: () => 0,
    }[sort] || (() => 0);
    return [...xs].sort(cmp);
  }, [tasks, filters, sort, query]);


  return (
    <aside className="task-pane">
      <header className="task-pane-hd">
        <SearchBar value={query} onChange={setQuery} />
        <div className="task-pane-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <FilterSortButtons
            filters={filters} setFilters={setFilters}
            sort={sort} setSort={setSort}
            columns={[
              { id: 'status', label: 'Status' },
              { id: 'priority', label: 'Priority' },
              { id: 'tag', label: 'Tag' }
            ]}
            getValuesForColumn={(col) => {
              if (col === 'status') return ['todo', 'next-up', 'doing', 'done'];
              if (col === 'priority') return ['P0', 'P1', 'P2', 'P3'];
              if (col === 'tag') return allTags;
              return [];
            }}
            sortOptions={[
              { id: 'priority', label: 'Priority' },
              { id: 'due', label: 'Due Date' },
              { id: 'est', label: 'Estimate' },
              { id: 'title', label: 'Title' },
              { id: 'added', label: 'Date Added' }
            ]}
          />
          
          <button 
            style={{ 
               marginLeft: 'auto',
               background: 'var(--bg-surface)', 
               border: '1px solid var(--border)', 
               color: 'var(--fg)', 
               borderRadius: '4px',
               cursor: 'pointer', 
               padding: '4px 6px', 
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
            }}
            title="Add Task"
            onClick={onAddTask}
          >
            <Icon name="add_task" size={16} />
          </button>
        </div>
      </header>

      <div 
        className="task-list"
        onDoubleClick={(e) => {
          const target = e.target as Element;
          if (!target.closest('.task-row') && !target.closest('button')) {
            onAddTask();
          }
        }}
      >
        {filtered.length === 0 ? (
          <div className="task-empty">
            <span className="dim">{tasks.length === 0 ? 'no tasks exist.' : 'no tasks match.'}</span>
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

      {footer}
    </aside>
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
        <div className={`task-row-pri-bar pri-bg-${task.priority}`} aria-label={task.priority} />
        <span className="task-row-title">{task.title}</span>
        {task.status === 'doing' && <span className="status-pill status-doing">doing</span>}
        {task.status === 'next-up' && <span className="status-pill status-nextup">next up</span>}
        
        <div className="task-row-actions">
           <button onClick={(e) => {
             e.stopPropagation();
             updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
           }} title="Toggle Done"><span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>check</span></button>
           <button onClick={(e) => {
             e.stopPropagation();
             if (e.shiftKey || confirm("Delete task?")) deleteTask(task.id);
           }} title="Delete"><span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>delete</span></button>
        </div>
      </div>
      <div className="task-row-line2">
        {!!task.est && task.est > 0 && (
          <>
            <span className="meta-est">{durationLabel(task.est)}</span>
            {task.tags.length > 0 && <span className="meta-sep">·</span>}
          </>
        )}
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
