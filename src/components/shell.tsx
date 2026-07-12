import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
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
        <div className="window-controls">
          <button className="win-btn green" onClick={handleMaximize} title="Maximize" />
          <button className="win-btn yellow" onClick={handleMinimize} title="Minimize" />
          <button className="win-btn red" onClick={handleClose} title="Close" />
        </div>
      </div>
    </header>
  );
}

function StageIndicator({ current }) {
  const stages = [
    { key: 'plan', label: 'plan', href: 'plan.html' },
    { key: 'do',   label: 'do',   href: 'do.html' },
    { key: 'rest', label: 'rest', href: 'rest.html' },
  ];
  return (
    <nav className="stages" aria-label="Stages">
      {stages.map((s, i) => (
        <React.Fragment key={s.key}>
          <a
            href={s.href}
            className={`stage ${current === s.key ? 'is-current' : ''}`}
            aria-current={current === s.key ? 'page' : undefined}
          >
            <span className="stage-name">{s.label}</span>
          </a>
          {i < stages.length - 1 && <span className="stage-sep">|</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export { TopBar, StageIndicator };
