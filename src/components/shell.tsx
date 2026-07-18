import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './icon';
import { MONTHS, DOW_SHORT, PAD2 } from '../core/data';

// Shared top bar + clickable stage indicator. Used across Plan, Do, Rest.
function TitleBar({ current, today }) {
  // @ts-ignore - electronAPI is injected via preload
  const handleMinimize = () => window.electronAPI?.minimizeWindow?.();
  // @ts-ignore
  const handleMaximize = () => window.electronAPI?.maximizeWindow?.();
  // @ts-ignore
  const handleClose = () => window.electronAPI?.closeWindow?.();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [dropdownOpen]);

  return (
    <header className="topbar">
      <div className="drag-region" />
      <div className="topbar-left">
        <Link to="/settings" className={`stage ${current === 'settings' ? 'is-current' : ''}`} style={{ padding: '0 4px', display: 'flex' }} aria-label="Settings">
          <Icon name="settings" size={18} />
        </Link>
        <StageIndicator current={current} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={dropdownRef}>
          <button 
            className={`stage ${dropdownOpen ? 'is-current' : ''}`}
            style={{ padding: '0 4px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="More screens"
          >
            <Icon name="keyboard_arrow_down" size={18} />
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '4px 0', zIndex: 100,
              display: 'flex', flexDirection: 'column', minWidth: '120px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              animation: 'dropdownFadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              transformOrigin: 'top left'
            }}>
              <style>{`
                @keyframes dropdownFadeIn {
                  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .dd-item {
                  background: transparent;
                  border: none;
                  padding: 8px 16px;
                  text-align: left;
                  cursor: pointer;
                  color: var(--fg-dim);
                  transition: color 80ms, background-color 100ms;
                }
                .dd-item:hover {
                  background-color: var(--bg-app);
                  color: var(--fg);
                }
              `}</style>
              {['wrap', 'graph', 'stats', 'recap'].map(screen => (
                <button
                  key={screen}
                  className="dd-item"
                  onClick={() => { setDropdownOpen(false); navigate(`/${screen}`); }}
                >
                  <span className="stage-name" style={{ textTransform: 'lowercase' }}>{screen}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="topbar-right">
      </div>
      <div className="window-controls">
        <button className="win-btn minimize" onClick={handleMinimize} title="Minimize">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M 1,5 h 8" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="win-btn maximize" onClick={handleMaximize} title="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="win-btn close" onClick={handleClose} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M 1.5,1.5 l 7,7 M 8.5,1.5 l -7,7" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
      </div>
    </header>
  );
}

function StageIndicator({ current }) {
  const stages = [
    { key: 'plan', label: 'plan', href: '/plan' },
    { key: 'do',   label: 'do',   href: '/do' },
  ];
  return (
    <nav className="stages" aria-label="Stages">
      {stages.map((s, i) => (
        <React.Fragment key={s.key}>
          <Link
            to={s.href}
            className={`stage ${current === s.key ? 'is-current' : ''}`}
            aria-current={current === s.key ? 'page' : undefined}
          >
            <span className="stage-name">{s.label}</span>
          </Link>
          {i < stages.length - 1 && <span className="stage-sep">|</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export { TitleBar, StageIndicator };
