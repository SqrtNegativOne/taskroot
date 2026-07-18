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
  const containerRef = React.useRef(null);
  const [thumbStyle, setThumbStyle] = React.useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0, init: false });

  React.useLayoutEffect(() => {
    const updateThumb = () => {
      if (!containerRef.current) return;
      const activeBtn = containerRef.current.querySelector('button[data-active="true"]');
      if (activeBtn) {
        setThumbStyle(prev => ({
          left: activeBtn.offsetLeft,
          top: activeBtn.offsetTop,
          width: activeBtn.offsetWidth,
          height: activeBtn.offsetHeight,
          opacity: 1,
          init: true
        }));
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
      {options.map(opt => (
        <button
          type="button"
          key={opt.value}
          data-active={opt.value === value}
          onClick={() => onChange(opt.value)}
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

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');
  const [recordingKeybinding, setRecordingKeybinding] = useState<string | null>(null);
  const [settings, setSettings] = useStored<any>('settings', { defaultCalendarView: 'month', defaultTaskDuration: 0, keybindingOpenSettings: 'Ctrl+,', earliest_wake_time: 480, last_sleep_time: 1320, recapDay: '', allowStopwatchWithoutTask: false, flowtimeBreakDivisor: 5 });
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
              className={`task-row ${activeTab === 'wrap_screen' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('wrap_screen')}
            >
              <div className="task-row-title">Wrap screen</div>
            </div>
            <div 
              className={`task-row ${activeTab === 'recap_screen' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('recap_screen')}
            >
              <div className="task-row-title">Recap screen</div>
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

              </>
            )}
            {activeTab === 'wrap_screen' && (
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
            )}
            {activeTab === 'recap_screen' && (
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
                    <SegmentedControl
                      value={settings.recapDay || ''}
                      onChange={v => setSettings({ ...settings, recapDay: v })}
                      options={[
                        { value: '', label: 'Never' },
                        { value: 'monday', label: 'Mon' },
                        { value: 'tuesday', label: 'Tue' },
                        { value: 'wednesday', label: 'Wed' },
                        { value: 'thursday', label: 'Thu' },
                        { value: 'friday', label: 'Fri' },
                        { value: 'saturday', label: 'Sat' },
                        { value: 'sunday', label: 'Sun' }
                      ]}
                    />
                  </label>
                </div>
              </div>
            )}
            {activeTab === 'do_screen' && (
              <>
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
                      value={settings.clockStyle || 'axleless'}
                      onChange={v => setSettings({ ...settings, clockStyle: v })}
                      options={[
                        { value: 'axleless', label: 'Axleless Stopwatch' },
                        { value: 'flowtime', label: 'Flowtime' },
                        { value: 'guzey', label: 'Guzey Clock' }
                      ]}
                    />
                  </label>
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">
                  Stopwatch Task Requirement
                </div>
                <div className="settings-section-desc dim">
                  Allow using the stopwatch without actively selecting a task first.
                </div>
                <div className="settings-section-actions">
                  <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                    <input 
                      type="checkbox" 
                      checked={!!settings.allowStopwatchWithoutTask} 
                      onChange={e => setSettings({ ...settings, allowStopwatchWithoutTask: e.target.checked })}
                    />
                    <span>Allow stopwatch use without selecting task</span>
                  </label>
                </div>
              </div>
              {settings.clockStyle === 'flowtime' && (
              <div className="settings-section">
                <div className="settings-section-title">
                  Flowtime Break Divisor
                </div>
                <div className="settings-section-desc dim">
                  How much break time you earn (e.g. 5 means 1 min break for every 5 mins of work).
                </div>
                <div className="settings-section-actions">
                  <label style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--fg)' }}>
                    <input 
                      type="number" 
                      min="1"
                      style={{ background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', width: '60px' }}
                      value={settings.flowtimeBreakDivisor || 5} 
                      onChange={e => setSettings({ ...settings, flowtimeBreakDivisor: parseInt(e.target.value) || 5 })}
                    />
                  </label>
                </div>
              </div>
              )}
              </>
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
