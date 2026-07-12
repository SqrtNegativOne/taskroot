import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { SAMPLE_TASKS, PAD2 } from '../../core/data';
import { useStored } from '../../core/store';

// Stopwatch — huge hero, count-up, start/stop/reset, persisted across reloads.

function Stopwatch() {
  const [state, setState] = useStored('stopwatch', { elapsed: 0, runningSince: null });
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [, setTick] = React.useState(0);

  const activeTask = tasks.find(t => t.status === 'doing');

  // While running, request animation frame to update display.
  React.useEffect(() => {
    if (state.runningSince == null) return;
    let raf;
    const loop = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.runningSince]);

  const running = state.runningSince != null;
  const currentMs = state.elapsed + (running ? Date.now() - state.runningSince : 0);

  const toggle = () => {
    setState(s => {
      if (s.runningSince) {
        return { elapsed: s.elapsed + (Date.now() - s.runningSince), runningSince: null };
      }
      return { ...s, runningSince: Date.now() };
    });
  };
  const reset = () => setState({ elapsed: 0, runningSince: null });

  const { h, m, s, cs } = splitTime(currentMs);

  // Keyboard shortcut: space to toggle, r to reset
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea, [contenteditable]')) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.code === 'KeyR' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <section className="stopwatch-hero">
      <div className="stopwatch-stage">

        <div className={`stopwatch-display ${running ? 'is-running' : ''}`}>
          <span className="sw-digits sw-h">{h}</span>
          <span className="sw-colon">:</span>
          <span className="sw-digits sw-m">{m}</span>
          <span className="sw-colon">:</span>
          <span className="sw-digits sw-s">{s}</span>
        </div>

        <div className="stopwatch-scroll-hint">
          <span className="dim">ctrl+r to reset</span>
          <span className="stopwatch-scroll-arrow">▼</span>
        </div>
      </div>
    </section>
  );
}

function SecondsTicker({ running, seconds }) {
  // 60 dots representing 60 seconds; the current second highlights amber.
  const dots = [];
  for (let i = 0; i < 60; i++) {
    const active = i <= seconds;
    const isCurrent = i === seconds;
    dots.push(
      <span
        key={i}
        className={`sw-tick ${active ? 'is-active' : ''} ${isCurrent && running ? 'is-current' : ''}`}
      />
    );
  }
  return <div className="sw-ticks">{dots}</div>;
}

function splitTime(ms) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return {
    h: PAD2(h),
    m: PAD2(m),
    s: PAD2(s),
    cs: PAD2(cs),
  };
}

export { Stopwatch };
