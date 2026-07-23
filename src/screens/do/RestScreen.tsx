import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { TODAY, REST_CHECKLIST_DEFAULTS, MONTHS, DOW_SHORT } from '../../core/store/data';
import { TitleBar } from '../../components/shell';
import { load, useStored, seedDefaults } from '../../core/store/store';

// Rest screen — large checklist, editable, resets on each visit.

export function RestScreen() {
  React.useEffect(() => { seedDefaults(); }, []);

  // Reset every visit: don't persist checks across reloads, but keep custom items.
  const [items, setItems] = useStored('restItems', REST_CHECKLIST_DEFAULTS);
  // Local check state — not persisted, resets every page load
  const [checked, setChecked] = React.useState({});
  const [editing, setEditing] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const toggle = (id) => setChecked(c => ({ ...c, [id]: !c[id] }));
  const updateItem = (id, title) => {
    if (!title.trim()) {
      setItems(its => its.filter(i => i.id !== id));
    } else {
      setItems(its => its.map(i => i.id === id ? { ...i, title: title.trim() } : i));
    }
    setEditing(null);
  };
  const addItem = () => {
    const t = draft.trim();
    if (!t) { setAdding(false); setDraft(''); return; }
    setItems(its => [...its, { id: `r${Date.now()}`, title: t, type: 'check' }]);
    setDraft(''); setAdding(false);
  };
  const removeItem = (id) => setItems(its => its.filter(i => i.id !== id));

  const allChecked = items.length > 0 && items.every(i => checked[i.id]);

  return (
    <div className="rest-main" style={{ padding: '24px', minHeight: 'auto' }}>
      <div className="rest-stage" style={{ margin: '0 auto' }}>
        <header className="rest-header">
          <div className="rest-bracket-row">
            <span className="bracket">┌─</span>
            <span className="rest-label">REST · {DOW_SHORT[TODAY.getDay()].toLowerCase()} {MONTHS[TODAY.getMonth()].toLowerCase()} {TODAY.getDate()}</span>
            <span className="bracket">─┐</span>
          </div>
          <h1 className="rest-title">
            Give yourself a pat on the back.
          </h1>
          <p className="rest-sub">
            Even a small <em>“attaboy”</em> or <em>“attagirl”</em> makes a difference.
          </p>
        </header>

        <ol className="rest-list">
          {items.map((item, idx) => (
            <li key={item.id} className={`rest-item ${checked[item.id] ? 'is-checked' : ''}`}>
              <button
                className="rest-checkbox"
                onClick={() => toggle(item.id)}
                aria-pressed={!!checked[item.id]}
              >
                <span className="rest-checkbox-box">
                  {checked[item.id] ? <span className="rest-check">✓</span> : <span className="rest-check-empty">  </span>}
                </span>
              </button>
              {editing === item.id ? (
                <input
                  autoFocus
                  className="rest-item-input"
                  defaultValue={item.title}
                  onBlur={(e) => updateItem(item.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { (e.target as HTMLElement).blur(); }
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
              ) : (
                <span className="rest-item-title" onClick={() => setEditing(item.id)}>
                  {item.title}
                </span>
              )}
              <button className="rest-item-x" onClick={() => removeItem(item.id)} title="Remove" tabIndex={-1}>×</button>
            </li>
          ))}
          <li className="rest-item rest-item-add">
            <span className="rest-checkbox rest-checkbox-add">
              <span className="rest-checkbox-box rest-checkbox-box-add">+</span>
            </span>
            {adding ? (
              <input
                autoFocus
                className="rest-item-input"
                placeholder="new rest item…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={addItem}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') { setAdding(false); setDraft(''); }
                }}
              />
            ) : (
              <button className="rest-item-add-btn" onClick={() => setAdding(true)}>add a rest item</button>
            )}
          </li>
        </ol>

        <section className="rest-reward">
          <header className="rest-reward-hd">
            <span className="bracket">▸</span>
            <span className="rest-reward-title">Reward yourself</span>
            <span className="rest-reward-warn">— not by procrastinating!</span>
          </header>
          <a
            href="#"
            className="rest-reward-link"
            onClick={(e) => e.preventDefault()}
          >
            <span className="rest-reward-link-bracket">[</span>
            <span className="rest-reward-link-text">Tactical Procrastination</span>
            <span className="rest-reward-link-bracket">]</span>
            <span className="rest-reward-link-arrow">↗</span>
          </a>
        </section>

        {allChecked && (
          <div className="rest-complete">
            <span className="bracket">└─</span>
            <span className="rest-complete-text">all good. back to work when you're ready.</span>
            <span className="bracket">─┘</span>
          </div>
        )}
      </div>
    </div>
  );
}




