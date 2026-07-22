import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { SAMPLE_TIPS, SAMPLE_NOTES } from '../../core/data';
import { useStored } from '../../core/store';

// Tips list + Notes (Obsidian placeholder)

export function TipsList() {
  const [tips, setTips] = useStored('tips', SAMPLE_TIPS);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const add = () => {
    const t = draft.trim();
    if (!t) { setAdding(false); return; }
    setTips(ts => [...ts, t]);
    setDraft('');
    setAdding(false);
  };

  return (
    <ul className="tips-list">
      {tips.map((tip, i) => (
        <li key={i} className="tips-row">
          <span className="tips-bullet">·</span>
          <span className="tips-text">{tip}</span>
          <button className="tips-x" onClick={() => setTips(ts => ts.filter((_, j) => j !== i))} title="Remove">×</button>
        </li>
      ))}
      <li className="tips-row tips-row-add">
        <span className="tips-bullet">+</span>
        {adding ? (
          <input
            autoFocus
            className="tips-input"
            placeholder="add a tip…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
          />
        ) : (
          <button className="tips-add-btn" onClick={() => setAdding(true)}>add a tip</button>
        )}
      </li>
    </ul>
  );
}

export function NotesList() {
  const [notes, setNotes] = useStored('notes', SAMPLE_NOTES);
  const [toast, setToast] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const openInObsidian = (note) => {
    // Mocked — would normally fire obsidian:// deep link
    setToast(`would open obsidian://${note.vault}/${note.path}`);
    setTimeout(() => setToast(null), 2200);
  };
  const remove = (id) => setNotes(ns => ns.filter(n => n.id !== id));
  const addNote = () => {
    const title = draft.trim();
    if (!title) { setAdding(false); return; }
    const id = `n${Date.now()}`;
    setNotes(ns => [...ns, { id, title, vault: 'work', path: `${title.toLowerCase().replace(/\s+/g, '-')}.md` }]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="notes">
      <ul className="notes-list">
        {notes.map(n => (
          <li key={n.id} className="notes-row">
            <button className="notes-link" onClick={() => openInObsidian(n)}>
              <span className="notes-icon">◈</span>
              <span className="notes-title">{n.title}</span>
              <span className="notes-path">obsidian://{n.vault}/{n.path}</span>
              <span className="notes-arrow">↗</span>
            </button>
            <button className="notes-x" onClick={() => remove(n.id)} title="Remove">×</button>
          </li>
        ))}
        <li className="notes-row notes-row-add">
          {adding ? (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', padding: '6px 4px', gap: '10px' }}>
              <span className="notes-icon">+</span>
              <input
                autoFocus
                className="tips-input"
                placeholder="note title…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={addNote}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNote();
                  if (e.key === 'Escape') { setAdding(false); setDraft(''); }
                }}
              />
            </div>
          ) : (
            <button className="notes-add-btn" onClick={() => setAdding(true)}>
              <span className="notes-icon">+</span> add note
            </button>
          )}
        </li>
      </ul>
      {toast && (
        <div className="notes-toast">
          <span className="bracket">▸</span> {toast}
          <span className="dim"> (placeholder — not actually opening)</span>
        </div>
      )}
    </div>
  );
}


