import React, { useMemo } from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY, SAMPLE_TASKS } from '../../core/data';
import { useStored } from '../../core/store';
import { TaskListPane } from '../../components/tasklist';
import { SplitPane } from '../../components/split-pane';
import { TaskCanvas } from './TaskCanvas';
import type { Task } from './TaskCanvas';

export function GraphScreen() {
  const [tasks, setTasks] = useStored<Task[]>('tasks', SAMPLE_TASKS as Task[]);
  
  // UI state — task list
  const [query, setQuery] = useStored('taskQuery', '');
  const [filters, setFilters] = useStored('taskFilters', [{ id: 'default-not-done', column: 'status', operator: 'is not', value: 'done' }]);
  const [sort, setSort] = useStored('taskSort', 'priority');
  
  const moveFilteredToCanvas = () => {
    let xs = tasks;
    for (const f of filters) {
      if (!f.column || !f.value) continue;
      xs = xs.filter(t => {
        let match = false;
        if (f.column === 'status') match = t.status === f.value;
        else if (f.column === 'priority') match = t.priority === Number(f.value);
        else if (f.column === 'tag') match = (t.tags || []).includes(f.value);
        return f.operator === 'is not' ? !match : match;
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(t => t.title.toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q)));
    }
    
    const idsToMove = new Set(xs.map(t => t.id));
    
    setTasks(prev => {
      let layoutIndex = 0;
      return prev.map(t => {
        if (idsToMove.has(t.id) && !t.onCanvas) {
          const newT = { ...t, onCanvas: true, canvasX: (layoutIndex % 4) * 250, canvasY: Math.floor(layoutIndex / 4) * 150 };
          layoutIndex++;
          return newT;
        }
        return t;
      });
    });
  };

  const footer = (
    <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      <button 
        onClick={moveFilteredToCanvas}
        style={{
          width: '100%',
          padding: '8px',
          background: 'var(--accent)',
          color: 'var(--bg)',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Move to canvas
      </button>
    </div>
  );

  return (
    <div className="app">
      <TitleBar current="graph" today={TODAY} />
      <main className="main">
        <SplitPane direction="horizontal" defaultSize={360} minSize={200} snapThreshold={50}>
          <TaskListPane
            tasks={tasks} setTasks={setTasks}
            filters={filters} setFilters={setFilters}
            sort={sort} setSort={setSort}
            query={query} setQuery={setQuery}
            onDragStart={() => {}}
            onAddTask={() => {
              const id = `t${Date.now()}`;
              setTasks(ts => [{
                 id, title: 'New Task', status: 'todo', priority: 1, tags: [], subtasks: [], parent_task: null, dependencies: [], est: 60, added: new Date().toISOString()
              }, ...ts]);
            }}
            onDeleteTask={(id: string) => setTasks(ts => ts.filter(t => t.id !== id))}
            footer={footer}
          />
          <div className="right-pane" style={{ position: 'relative', width: '100%', height: '100%' }}>
             <TaskCanvas tasks={tasks} setTasks={setTasks} />
          </div>
        </SplitPane>
      </main>
    </div>
  );
}
