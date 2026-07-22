import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';

// Collapsible toggle primitive — TUI-style with chevron.

export function Collapsible({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={`collapsible ${open ? 'is-open' : ''}`}>
      <button
        className="collapsible-head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="collapsible-chev">{open ? '▾' : '▸'}</span>
        <span className="collapsible-title">{title}</span>
        {badge != null && <span className="collapsible-badge">{badge}</span>}
        <span className="collapsible-rule" />
        <span className="collapsible-hint">{open ? 'collapse' : 'expand'}</span>
      </button>
      {open && (
        <div className="collapsible-body">
          {children}
        </div>
      )}
    </section>
  );
}


