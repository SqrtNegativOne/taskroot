import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { TitleBar } from '../../components/shell';
import { SearchBar } from '../../components/search-bar';
import { TODAY } from '../../core/data';
import { useStored } from '../../core/store';
import { api } from '../../core/api';
import './settings.css';
import { SETTINGS_SCHEMA, SETTINGS_TABS, DEFAULT_SETTINGS } from '../../core/settingsSchema';

function minToTime(m: number) {
  if (typeof m !== 'number' || isNaN(m)) return '';
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function timeToMin(t: string) {
  if (!t) return 0;
  const [hh, mm] = t.split(':');
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

function SegmentedControl({ options, value, onChange }: any) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = React.useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0, init: false });

  React.useLayoutEffect(() => {
    const updateThumb = () => {
      if (!containerRef.current) return;
      const activeBtn = containerRef.current.querySelector('button[data-active="true"]') as HTMLButtonElement;
      if (activeBtn) {
        setThumbStyle({
          left: activeBtn.offsetLeft,
          top: activeBtn.offsetTop,
          width: activeBtn.offsetWidth,
          height: activeBtn.offsetHeight,
          opacity: 1,
          init: true
        });
      } else {
        setThumbStyle(prev => ({ ...prev, opacity: 0, init: true }));
      }
    };

    updateThumb();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver(updateThumb);
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [value, options]);

  return (
    <div ref={containerRef} style={{ display: 'inline-flex', position: 'relative', background: 'var(--bg-app)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)', userSelect: 'none', flexWrap: 'wrap', gap: '2px', zIndex: 0 }}>
      <div style={{
        position: 'absolute',
        background: 'var(--bg-surface)',
        borderRadius: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)',
        transition: thumbStyle.init ? 'all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'none',
        left: thumbStyle.left,
        top: thumbStyle.top,
        width: thumbStyle.width,
        height: thumbStyle.height,
        opacity: thumbStyle.opacity,
        zIndex: -1
      }} />
      {options.map((opt: any) => (
        <button
          type="button"
          key={opt.value}
          data-active={opt.value === value}
          onClick={() => onChange(opt.value)}
          data-cuelume-toggle
          style={{
            appearance: 'none', background: 'transparent',
            border: 'none', borderRadius: '5px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer',
            color: opt.value === value ? 'var(--fg)' : 'var(--fg-dim)',
            fontWeight: opt.value === value ? 500 : 400,
            transition: 'color 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
            flex: '1 1 auto', textAlign: 'center', whiteSpace: 'nowrap'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CalendarCategories({ settings, setSettings }: any) {
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

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');
  const [recordingKeybinding, setRecordingKeybinding] = useState<string | null>(null);
  const [settings, setSettings] = useStored<any>('settings', DEFAULT_SETTINGS);
  const [tasks, setTasks] = useStored<any[]>('tasks', []);
  const [ingestText, setIngestText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fuse = useMemo(() => new Fuse(SETTINGS_SCHEMA, { keys: ['label', 'description', 'keywords', 'section'], threshold: 0.3 }), []);

  const displayedSettings = useMemo(() => {
    if (searchQuery.trim()) {
      return fuse.search(searchQuery).map(res => res.item);
    }
    return SETTINGS_SCHEMA.filter(s => s.tab === activeTab);
  }, [searchQuery, activeTab, fuse]);

  const settingsBySection = useMemo(() => {
    const grouped: Record<string, typeof SETTINGS_SCHEMA> = {};
    for (const s of displayedSettings) {
      if (!grouped[s.section]) grouped[s.section] = [];
      grouped[s.section].push(s);
    }
    return grouped;
  }, [displayedSettings]);

  const renderAction = (setting: any) => {
    if (setting.action === 'calendarCategories') {
      return <CalendarCategories settings={settings} setSettings={setSettings} />;
    }
    if (setting.action === 'exportData') {
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
    if (setting.action === 'importTasks') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  priority: 'P2',
                  tags: [],
                  subtasks: [],
                  parent_task: null,
                  dependency: null,
                  est: settings.defaultTaskDuration !== undefined ? settings.defaultTaskDuration : 0,
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
    if (setting.action === 'restoreBackup') {
      return (
        <button className="sw-btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => {
          if (!window.confirm("Are you sure? This will overwrite your current state with the last known good snapshot from today, and reload the app.")) return;
          const today = new Date().toISOString().slice(0, 10);
          let restoredAny = false;
          
          const backupKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('taskroot_backup_') && key.endsWith(`_${today}`)) {
              backupKeys.push(key);
            }
          }
          
          for (const key of backupKeys) {
            const originalKey = key.replace('taskroot_backup_', 'taskroot_').replace(`_${today}`, '');
            const backupData = localStorage.getItem(key);
            if (backupData) {
              localStorage.setItem(originalKey, backupData);
              restoredAny = true;
            }
          }
          
          if (restoredAny) {
            window.location.reload();
          } else {
            alert("No backups found for today.");
          }
        }}>
          Restore Today's Backup
        </button>
      );
    }
    if (setting.action === 'clearAllData') {
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
    return null;
  };

  const renderSetting = (setting: any) => {
    const val = settings[setting.id] !== undefined ? settings[setting.id] : setting.defaultValue;
    
    const isComplex = setting.type === 'action' && ['calendarCategories', 'importTasks'].includes(setting.action);

    return (
      <div className="settings-section" key={setting.id} style={{ 
        marginBottom: setting.danger ? '32px' : '12px',
        display: 'flex',
        flexDirection: isComplex ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isComplex ? 'flex-start' : 'center',
        gap: isComplex ? '8px' : '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div className="settings-section-title" style={{ color: setting.danger ? 'var(--red)' : undefined }}>
            {setting.label} {setting.beta && <span className="status-pill status-nextup">BETA</span>}
          </div>
          {setting.description && (
            <div className="settings-section-desc dim" style={{ marginBottom: 0 }}>
              {setting.description}
            </div>
          )}
        </div>
        <div className="settings-section-actions" style={{ margin: 0, flexShrink: 0, display: setting.danger ? 'flex' : 'block', justifyContent: setting.danger ? 'flex-end' : 'flex-start' }}>
          {setting.type === 'select' && (
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
              <SegmentedControl
                value={val}
                onChange={(v: any) => setSettings({ ...settings, [setting.id]: typeof val === 'number' ? Number(v) : v })}
                options={setting.options}
              />
            </label>
          )}
          {setting.type === 'time' && (
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
              <input type="time" value={minToTime(val)} onChange={e => setSettings({ ...settings, [setting.id]: timeToMin(e.target.value) })} style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px' }} />
            </label>
          )}
          {setting.type === 'number' && (
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
              <input type="number" min={setting.min} max={setting.max} value={val} onChange={e => setSettings({ ...settings, [setting.id]: Number(e.target.value) || 0 })} style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', width: '80px' }} />
            </label>
          )}
          {setting.type === 'checkbox' && (
            <div 
              style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)', cursor: 'pointer' }}
              onClick={() => setSettings({ ...settings, [setting.id]: !val })}
              data-cuelume-toggle
            >
              <div className={`toggle-switch ${val ? 'is-on' : ''}`}>
                <div className="toggle-switch-thumb" />
              </div>
            </div>
          )}
          {setting.type === 'keybinding' && (
            <kbd 
              style={{
                padding: '4px 8px',
                background: recordingKeybinding === setting.id ? 'var(--accent-soft)' : 'var(--bg-app)',
                border: '1px solid ' + (recordingKeybinding === setting.id ? 'var(--accent)' : 'var(--border)'),
                borderRadius: '4px',
                fontSize: '0.9em',
                fontFamily: 'monospace',
                cursor: 'pointer',
                color: 'var(--fg)',
                display: 'inline-block'
              }}
              onClick={(e) => {
                e.preventDefault();
                setRecordingKeybinding(setting.id);
                const handler = (evt: KeyboardEvent) => {
                  evt.preventDefault();
                  evt.stopPropagation();
                  if (evt.key === 'Escape') {
                    setRecordingKeybinding(null);
                    window.removeEventListener('keydown', handler);
                    return;
                  }
                  const parts = [];
                  if (evt.ctrlKey) parts.push('Ctrl');
                  if (evt.metaKey) parts.push('Meta');
                  if (evt.altKey) parts.push('Alt');
                  if (evt.shiftKey) parts.push('Shift');
                  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(evt.key)) {
                    parts.push(evt.key === ' ' ? 'Space' : evt.key.length === 1 ? evt.key.toUpperCase() : evt.key);
                    setSettings({ ...settings, [setting.id]: parts.join('+') });
                    setRecordingKeybinding(null);
                    window.removeEventListener('keydown', handler);
                  }
                };
                window.addEventListener('keydown', handler);
              }}
            >
              {recordingKeybinding === setting.id ? 'Press any key...' : (val || '')}
            </kbd>
          )}
          {setting.type === 'action' && renderAction(setting)}
        </div>
      </div>
    );
  };

  return (
    <div className="app app-settings">
      <TitleBar current="settings" today={TODAY} />
      <div className="main settings-main">
        <div className="task-pane settings-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="task-pane-hd">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {!searchQuery && (
            <div className="task-list">
              {SETTINGS_TABS.map(tab => (
                <div 
                  key={tab.id}
                  className={`task-row ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-cuelume-hover="tick"
                  data-cuelume-toggle
                >
                  <div className="task-row-title">{tab.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="right-pane settings-content">
          <div className="settings-detail-pane">
            {Object.entries(settingsBySection).map(([section, settingsList]) => (
              <div key={section} style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--fg)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  {section}
                </h3>
                {settingsList.map(renderSetting)}
              </div>
            ))}
            
            {displayedSettings.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-dim)' }}>
                No settings found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
