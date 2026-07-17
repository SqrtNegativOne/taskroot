import React, { useState } from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY } from '../../core/data';
import { useStored } from '../../core/store';
import './settings.css';

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useStored('settings', { defaultCalendarView: 'month' });

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
              <div className="task-row-title">General</div>
            </div>
            <div 
              className={`task-row ${activeTab === 'sync' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              <div className="task-row-title">Sync and Backup</div>
            </div>
            {/* Future categories will go here */}
          </div>
        </div>
        
        <div className="right-pane settings-content">
          <div className="cal-hd">
            <div className="cal-hd-left">
              <span className="cal-hd-title">
                {activeTab === 'general' && 'General Settings'}
                {activeTab === 'sync' && 'Sync and Backup'}
              </span>
            </div>
          </div>
          
          <div className="settings-detail-pane">
            {activeTab === 'general' && (
              <div className="settings-section">
                <div className="settings-section-title">
                  Calendar
                </div>
                <div className="settings-section-desc dim">
                  Set your default calendar view.
                </div>
                <div className="settings-section-actions" style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--fg)' }}>
                    <span>Default View:</span>
                    <select 
                      className="selector-input" 
                      style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-app)', color: 'var(--fg)' }}
                      value={settings.defaultCalendarView || 'month'}
                      onChange={e => setSettings({ ...settings, defaultCalendarView: e.target.value })}
                    >
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                    </select>
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
          </div>
        </div>
      </div>
    </div>
  );
}
