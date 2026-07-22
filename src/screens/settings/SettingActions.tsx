import React, { useState } from 'react';
import { api } from '../../core/api';
import { useAuth } from '../../core/AuthContext';
import { useStored } from '../../core/store';

export function CalendarCategories({ settings, setSettings }: { settings: any, setSettings: any }) {
  const [calendars, setCalendars] = useState<{id: string, summary: string}[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newCalId, setNewCalId] = useState('primary');

  React.useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(data => {
        if (data.items) {
          setCalendars([{ id: 'primary', summary: 'Primary Calendar' }, ...data.items.filter((c: any) => c.id !== 'primary')]);
        }
      }).catch(e => {
         console.error('Failed to fetch calendars', e);
      });
    } else {
      setCalendars([{ id: 'primary', summary: 'Primary Calendar' }]);
    }
  }, []);

  const cats = settings.categoryCalendars || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Object.entries(cats).map(([cat, calId]) => (
        <div key={cat} style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
          <span style={{ minWidth: '120px' }}>{cat}</span>
          <select 
            value={calId as string}
            onChange={e => {
              const newCats = { ...cats, [cat]: e.target.value };
              setSettings({ ...settings, categoryCalendars: newCats });
            }}
            style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', flex: 1 }}
          >
            {calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
          </select>
          <button className="sw-btn" style={{ padding: '4px 8px' }} onClick={() => {
            const newCats = { ...cats };
            delete newCats[cat];
            setSettings({ ...settings, categoryCalendars: newCats });
          }}>Remove</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
         <input 
            placeholder="New category name..."
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', width: '120px' }}
         />
         <select 
            value={newCalId}
            onChange={e => setNewCalId(e.target.value)}
            style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', flex: 1 }}
          >
            {calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
         </select>
         <button className="sw-btn" style={{ padding: '4px 8px' }} onClick={() => {
            if (newCat) {
              setSettings({ ...settings, categoryCalendars: { ...cats, [newCat]: newCalId } });
              setNewCat('');
              setNewCalId('primary');
            }
         }}>Add</button>
      </div>
    </div>
  );
}

export function ExportDataButton() {
  return (
    <button className="sw-btn" onClick={() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('taskroot_')) {
          try {
            data[key.replace('taskroot_', '')] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch (e) {
            data[key.replace('taskroot_', '')] = localStorage.getItem(key);
          }
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskroot-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }}>
      Export Data
    </button>
  );
}

export function ImportTasksButton({ settings }: { settings: any }) {
  const [ingestText, setIngestText] = useState('');
  const [tasks, setTasks] = useStored<any[]>('tasks', []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <textarea 
        value={ingestText}
        onChange={e => setIngestText(e.target.value)}
        placeholder="Task 1&#10;Task 2&#10;Task 3"
        style={{ 
          width: '100%', 
          minHeight: '100px', 
          background: 'var(--bg-app)', 
          color: 'var(--fg)', 
          border: '1px solid var(--border)', 
          borderRadius: '4px', 
          padding: '8px',
          fontFamily: 'inherit',
          resize: 'vertical'
        }}
      />
      <button 
        className="sw-btn" 
        onClick={() => {
          const lines = ingestText.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const newTasks = lines.map(line => ({
              id: `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: line,
              status: 'todo',
              priority: 1,
              tags: [],
              subtasks: [],
              parent_task: null,
              dependency: null,
              est: (settings.defaultTaskDuration === 0 || settings.defaultTaskDuration === undefined) ? undefined : settings.defaultTaskDuration,
              added: new Date().toISOString()
            }));
            setTasks(ts => [...newTasks, ...(ts || [])]);
            setIngestText('');
            alert(`Imported ${newTasks.length} tasks!`);
          }
        }}
        disabled={!ingestText.trim()}
        style={{ alignSelf: 'flex-start' }}
      >
        Import Tasks
      </button>
    </div>
  );
}

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button className="sw-btn" onClick={async () => {
      await logout();
    }}>
      Sign Out
    </button>
  );
}

export function ClearAllDataButton() {
  return (
    <button className="sw-btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={async () => {
      if (!window.confirm("WARNING: This will permanently wipe all your data from both local storage and the cloud. Are you absolutely sure?")) return;
      if (!window.confirm("This action cannot be undone. Click OK to proceed with the wipe.")) return;
      
      await api.clearAllData();
      window.location.reload();
    }}>
      Delete everything
    </button>
  );
}
