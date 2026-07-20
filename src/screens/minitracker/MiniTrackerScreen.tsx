import React, { useState, useEffect } from 'react';
import '@fontsource/atkinson-hyperlegible-next';
import { useStored } from '../../core/store';
import { PAD2 } from '../../core/data';

function splitTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  return { m: PAD2(totalMin), s: PAD2(totalSec % 60) };
}

export function MiniTrackerScreen() {
  const [state, setState] = useStored('stopwatch', { elapsed: 0, runningSince: null, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false });
  const [tasks] = useStored('tasks', []);
  const [settings] = useStored<any>('settings', {});
  const [now, setNow] = useState(Date.now());
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/wine-glass-alarm.ogg');
    }
  }, []);

  useEffect(() => {
    let raf;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (state.isBreak && state.breakStartedAt && !state.breakSoundPlayed) {
      if (Date.now() - state.breakStartedAt >= state.breakAllowedMs) {
        audioRef.current?.play().catch(e => console.error("Sound play failed", e));
        setState(s => ({ ...s, breakSoundPlayed: true }));
      }
    }
  }, [now, state.isBreak, state.breakStartedAt, state.breakAllowedMs, state.breakSoundPlayed]);

  const activeTask = tasks?.find((t: any) => t.status === 'doing');
  const clockStyle = settings.clockStyle || 'counter';

  const running = state.runningSince != null;
  const currentMs = state.elapsed + (running && !state.isBreak ? now - state.runningSince : 0);

  let content = null;

  if (!activeTask && !settings.allowStopwatchWithoutTask) {
    content = <div style={{ color: 'var(--fg-dim)' }}>No active task.</div>;
  } else {
    const taskName = activeTask ? activeTask.title : 'Work session';
    
    if (clockStyle === 'counter') {
      const { m } = splitTime(currentMs);
      content = <div><span style={{ fontWeight: 'normal' }}>{m}</span> {taskName}</div>;
    } else if (clockStyle === 'flowtime') {
      if (state.isBreak && state.breakStartedAt) {
        const remSecs = Math.max(0, Math.ceil((state.breakAllowedMs - (now - state.breakStartedAt)) / 1000));
        const remM = Math.floor(remSecs / 60);
        const remS = remSecs % 60;
        const color = remSecs === 0 ? "var(--red)" : "var(--tag-green)";
        content = (
          <div style={{ color }}>
            <span style={{ fontWeight: 'normal' }}>{PAD2(remM)}:{PAD2(remS)}</span> break left
          </div>
        );
      } else {
        const { m } = splitTime(currentMs);
        content = <div><span style={{ fontWeight: 'normal' }}>{m}</span> {taskName}</div>;
      }
    } else if (clockStyle === 'guzey') {
      const d = new Date(now);
      const h = d.getHours();
      const min = d.getMinutes();
      const isLongBreak = (h % 3 === 0);
      let breakState = "WORK";
      let nextMin = 60;
      
      if (isLongBreak && min < 35) { breakState = "BREAK"; nextMin = 35; }
      else if (min >= 0 && min < 5) { breakState = "BREAK"; nextMin = 5; }
      else if (min >= 5 && min < 30) { breakState = "WORK"; nextMin = 30; }
      else if (min >= 30 && min < 35) { breakState = "BREAK"; nextMin = 35; }
      else { breakState = "WORK"; nextMin = 60; }

      let target = new Date(d);
      target.setSeconds(0);
      target.setMilliseconds(0);
      if (nextMin === 60) {
        target.setMinutes(0);
        target.setHours(target.getHours() + 1);
      } else {
        target.setMinutes(nextMin);
      }
      
      const remainingMs = target.getTime() - d.getTime();
      const remS = Math.floor(remainingMs / 1000);
      const remM = Math.floor(remS / 60);
      const finalS = remS % 60;

      if (!running) {
        content = <div style={{ color: 'var(--fg-dim)' }}>TRACKING PAUSED</div>;
      } else {
        if (breakState === "BREAK") {
          content = <div style={{ color: 'var(--tag-green)' }}>{PAD2(remM)}:{PAD2(finalS)} left for break</div>;
        } else {
          content = <div>{PAD2(remM)}:{PAD2(finalS)} left working for {taskName}</div>;
        }
      }
    }
  }

  const handleDoubleClick = () => {
    if ((window as any).electronAPI?.restoreMainWindow) {
      (window as any).electronAPI.restoreMainWindow();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const kb = settings.keybindingRestoreApp || 'Ctrl+Alt+R';
      const parts = kb.split('+');
      const key = parts.pop();
      const needsCtrl = parts.includes('Ctrl');
      const needsAlt = parts.includes('Alt');
      const needsShift = parts.includes('Shift');
      const needsMeta = parts.includes('Meta');

      const keyMatch = (e.key.toUpperCase() === key?.toUpperCase()) || (e.key === ' ' && key === 'Space');
      if (
        e.ctrlKey === needsCtrl &&
        e.altKey === needsAlt &&
        e.shiftKey === needsShift &&
        e.metaKey === needsMeta &&
        keyMatch
      ) {
        e.preventDefault();
        handleDoubleClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.keybindingRestoreApp]);

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'rgba(24, 24, 24, 0.5)',
        color: 'var(--fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Atkinson Hyperlegible Next', monospace",
        fontSize: '16px',
        userSelect: 'none',
        WebkitAppRegion: 'drag', // allows dragging the window
        cursor: 'default',
        padding: '16px',
        boxSizing: 'border-box',
        textAlign: 'center'
      } as any}
      title="Double-click to restore main window"
    >
      {content}
    </div>
  );
}
