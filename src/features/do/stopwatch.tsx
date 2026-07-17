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

  const { m } = splitTime(currentMs);

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

        <div className={`stopwatch-display ${running ? 'is-running' : ''}`} onClick={toggle} title="Click to start/stop">
          <span className="sw-digits sw-m">{m}</span>
        </div>

      </div>
    </section>
  );
}

function splitTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  return {
    m: PAD2(totalMin),
  };
}

export { Stopwatch };
