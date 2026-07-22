import React, { useState } from 'react';
import { api } from '../../core/api';
import { useAuth } from '../../core/AuthContext';
import { useStored } from '../../core/store';

function CustomSelect({ options, value, onChange }: any) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutside = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  const selectedOpt = options.find((o: any) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: '100px' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          background: 'var(--bg-input, var(--bg-surface))', color: 'var(--fg)', border: '1px solid var(--border)', 
          borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOpt ? selectedOpt.label : 'Select...'}
        </span>
        <span style={{ fontSize: '10px', marginLeft: '8px', opacity: 0.7 }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px',
          maxHeight: '200px', overflowY: 'auto', zIndex: 100,
          boxShadow: 'var(--shadow-btn-hover)'
        }}>
          {options.map((o: any) => (
            <div 
              key={o.value} 
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ 
                padding: '6px 8px', cursor: 'pointer', color: 'var(--fg)', 
                background: value === o.value ? 'var(--bg-highlight)' : 'transparent',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
              onMouseEnter={e => (e.target as HTMLDivElement).style.background = 'var(--bg-highlight)'}
              onMouseLeave={e => (e.target as HTMLDivElement).style.background = value === o.value ? 'var(--bg-highlight)' : 'transparent'}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <CustomSelect 
            value={calId as string}
            options={calendars.map(c => ({ label: c.summary, value: c.id }))}
            onChange={(val: string) => {
              const newCats = { ...cats, [cat]: val };
              setSettings({ ...settings, categoryCalendars: newCats });
            }}
          />
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
         <CustomSelect 
            value={newCalId}
            options={calendars.map(c => ({ label: c.summary, value: c.id }))}
            onChange={(val: string) => setNewCalId(val)}
          />
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
