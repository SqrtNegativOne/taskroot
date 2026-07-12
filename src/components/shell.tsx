import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MONTHS, DOW_SHORT, PAD2 } from '../core/data';

// Shared top bar + clickable stage indicator. Used across Plan, Do, Rest.

function TopBar({ current, today }) {
  // @ts-ignore - electronAPI is injected via preload
  const handleMinimize = () => window.electronAPI?.minimizeWindow?.();
  // @ts-ignore
  const handleMaximize = () => window.electronAPI?.maximizeWindow?.();
  // @ts-ignore
  const handleClose = () => window.electronAPI?.closeWindow?.();

  return (
    <header className="topbar">
      <div className="drag-region" />
      <div className="topbar-left">
        <StageIndicator current={current} />
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
    { key: 'rest', label: 'rest', href: '/rest' },
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

export { TopBar, StageIndicator };
