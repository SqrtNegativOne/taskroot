import React, { useState } from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY } from '../../core/data';
import { useStored } from '../../core/store';
import './settings.css';

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

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-app)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)', userSelect: 'none', flexWrap: 'wrap', gap: '2px' }}>
      {options.map(opt => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            appearance: 'none', background: opt.value === value ? 'var(--bg-surface)' : 'transparent',
            border: 'none', borderRadius: '5px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer',
            color: opt.value === value ? 'var(--fg)' : 'var(--fg-dim)',
            boxShadow: opt.value === value ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
            fontWeight: opt.value === value ? 500 : 400,
            transition: 'all 0.15s cubic-bezier(0.3, 0.7, 0.4, 1)',
            flex: '1 1 auto', textAlign: 'center', whiteSpace: 'nowrap'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');
  const [recordingKeybinding, setRecordingKeybinding] = useState<string | null>(null);
  const [settings, setSettings] = useStored<any>('settings', { defaultCalendarView: 'month', defaultTaskDuration: 0, keybindingOpenSettings: 'Ctrl+,', earliest_wake_time: 480, last_sleep_time: 1320, recapDay: '' });
  const [tasks, setTasks] = useStored('tasks', []);
  const [ingestText, setIngestText] = useState('');

  return (
    <div className="app app-settings">
      <TitleBar current="settings" today={TODAY} />
      <div className="main settings-main">
        <div className="task-pane settings-sidebar">
          <div className="task-pane-hd">
            <div className="task-pane-title">
              <span className="bracket">[</span>
              <span className="task-pane-title-label">SETTINGS</span>
              <span className="bracket">]</span>
            </div>
          </div>
          <div className="task-list">
            <div 
              className={`task-row ${activeTab === 'general' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <div className="task-row-title">Plan screen</div>
            </div>
            <div 
              className={`task-row ${activeTab === 'do_screen' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('do_screen')}
            >
              <div className="task-row-title">Do screen</div>
            </div>
            <div 
              className={`task-row ${activeTab === 'sync' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              <div className="task-row-title">Sync and Backup</div>
            </div>
            <div 
              className={`task-row ${activeTab === 'keybindings' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('keybindings')}
            >
              <div className="task-row-title">Keybindings</div>
            </div>
            {/* Future categories will go here */}
          </div>
        </div>
        
        <div className="right-pane settings-content">
          <div className="settings-detail-pane">
            {activeTab === 'general' && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">
                    Calendar
                  </div>
                  <div className="settings-section-desc dim">
                    Set your default calendar view.
                  </div>
                  <div className="settings-section-actions">
                    <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                      <span style={{ minWidth: '120px' }}>Default View:</span>
                      <SegmentedControl
                        value={settings.defaultCalendarView || 'month'}
                        onChange={v => setSettings({ ...settings, defaultCalendarView: v })}
                        options={[
                          { value: 'month', label: 'Month' },
                          { value: 'week', label: 'Week' }
                        ]}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="settings-section">
                  <div className="settings-section-title">
                    Tasks
                  </div>
                  <div className="settings-section-desc dim">
                    Set the default estimated duration for new tasks.
                  </div>
                  <div className="settings-section-actions">
                    <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                      <span style={{ minWidth: '120px' }}>Default Duration:</span>
                      <SegmentedControl
                        value={settings.defaultTaskDuration !== undefined ? settings.defaultTaskDuration : 0}
                        onChange={v => setSettings({ ...settings, defaultTaskDuration: parseInt(v, 10) })}
                        options={[
                          { value: 0, label: 'Not set' },
                          { value: 15, label: '15m' },
                          { value: 30, label: '30m' },
                          { value: 45, label: '45m' },
                          { value: 60, label: '1h' },
                          { value: 90, label: '1.5h' },
                          { value: 120, label: '2h' }
                        ]}
                      />
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">
                    Time & Routine
                  </div>
                  <div className="settings-section-desc dim">
                    Set your waking and sleeping hours for time tracking.
                  </div>
                  <div className="settings-section-actions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                        <span style={{ minWidth: '150px' }}>Earliest wake time:</span>
                        <input type="time" value={minToTime(settings.earliest_wake_time || 480)} onChange={e => setSettings({ ...settings, earliest_wake_time: timeToMin(e.target.value) })} style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px' }} />
                      </label>
                      <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                        <span style={{ minWidth: '150px' }}>Latest sleep time:</span>
                        <input type="time" value={minToTime(settings.last_sleep_time || 1320)} onChange={e => setSettings({ ...settings, last_sleep_time: timeToMin(e.target.value) })} style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px' }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">
                    Recap
                  </div>
                  <div className="settings-section-desc dim">
                    Set the day of the week to do a weekly recap.
                  </div>
                  <div className="settings-section-actions">
                    <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                      <span style={{ minWidth: '150px' }}>Recap Day:</span>
                      <select value={settings.recapDay || ''} onChange={e => setSettings({ ...settings, recapDay: e.target.value })} style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px' }}>
                        <option value="">Never</option>
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </label>
                  </div>
                </div>
              </>
            )}
            {activeTab === 'do_screen' && (
              <div className="settings-section">
                <div className="settings-section-title">
                  Clock Style
                </div>
                <div className="settings-section-desc dim">
                  Choose between the Classic Stopwatch or the Guzey Clock.
                </div>
                <div className="settings-section-actions">
                  <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                    <span style={{ minWidth: '120px' }}>Clock Style:</span>
                    <SegmentedControl
                      value={settings.clockStyle || 'classic'}
                      onChange={v => setSettings({ ...settings, clockStyle: v })}
                      options={[
                        { value: 'classic', label: 'Classic Stopwatch' },
                        { value: 'guzey', label: 'Guzey Clock' }
                      ]}
                    />
                  </label>
                </div>
              </div>
            )}
            {activeTab === 'sync' && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">
                    Export Data <span className="status-pill status-nextup">BETA</span>
                  </div>
                  <div className="settings-section-desc dim">
                    Export all your local data as JSON. 
                  </div>
                  <div className="settings-section-actions">
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
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">
                    Bulk Import Tasks
                  </div>
                  <div className="settings-section-desc dim">
                    Paste in tasks separated by newlines. They will be added as new tasks to the top of your list.
                  </div>
                  <div className="settings-section-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">
                    Restore from Backup
                  </div>
                  <div className="settings-section-desc dim">
                    If your data got corrupted, restore it from today's automatic backup snapshot. This will reload the application.
                  </div>
                  <div className="settings-section-actions">
                    <button className="sw-btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => {
                      if (!window.confirm("Are you sure? This will overwrite your current state with the last known good snapshot from today, and reload the app.")) return;
                      const today = new Date().toISOString().slice(0, 10);
                      let restoredAny = false;
                      
                      // Find all backup keys for today
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
                  </div>
                </div>
              </>
            )}
            {activeTab === 'keybindings' && (
              <div className="settings-section">
                <div className="settings-section-title">
                  Keyboard Shortcuts
                </div>
                <div className="settings-section-desc dim">
                  Navigate and control Taskroot quickly.
                </div>
                <div className="settings-section-actions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--fg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <span>Open Settings</span>
                      <kbd 
                        style={{
                          padding: '4px 8px',
                          background: recordingKeybinding === 'openSettings' ? 'var(--accent-soft)' : 'var(--bg-app)',
                          border: '1px solid ' + (recordingKeybinding === 'openSettings' ? 'var(--accent)' : 'var(--border)'),
                          borderRadius: '4px',
                          fontSize: '0.9em',
                          fontFamily: 'monospace',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setRecordingKeybinding('openSettings');
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
                              setSettings({ ...settings, keybindingOpenSettings: parts.join('+') });
                              setRecordingKeybinding(null);
                              window.removeEventListener('keydown', handler);
                            }
                          };
                          window.addEventListener('keydown', handler);
                        }}
                      >
                        {recordingKeybinding === 'openSettings' ? 'Press any key...' : (settings.keybindingOpenSettings || 'Ctrl+,')}
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
