import React, { useState } from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY } from '../../core/data';
import { useStored } from '../../core/store';
import './settings.css';

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
  const [settings, setSettings] = useStored('settings', { defaultCalendarView: 'month', defaultTaskDuration: 0, keybindingOpenSettings: 'Ctrl+,' });

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
              <div className="settings-section">
                <div className="settings-section-title">
                  Export Data <span className="status-pill status-nextup">BETA</span>
                </div>
                <div className="settings-section-desc dim">
                  Export all your local data as JSON. 
                  <br /><br />
                  {/* Note: This is temporary code. The final input/output schema and functionality will be decided later. */}
                  Note: This feature is currently in beta and uses temporary code. The final import/export data scheme will be designed and implemented later.
                </div>
                <div className="settings-section-actions">
                  <button className="sw-btn" onClick={() => {
                    const data = {
                      tasks: localStorage.getItem('tasks'),
                      events: localStorage.getItem('events')
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'taskroot-backup.json';
                    a.click();
                  }}>
                    Export Data
                  </button>
                </div>
              </div>
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
