import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SAMPLE_TASKS, SAMPLE_EVENTS, PAD2, ymd } from '../../core/data';
import { useStored } from '../../core/store';
import { Icon } from '../../components/icon';

// Helper to log sessions
export function logWorkSession(setTimeLogs: any, startMs: number, endMs: number, taskId: string | null, clockStyle: string) {
  if (!startMs || !endMs) return;
  if (endMs - startMs < 60000) return; // ignore < 1 min sessions
  setTimeLogs(logs => [...(logs || []), {
    id: `log-${Date.now()}-${Math.floor(Math.random()*10000)}`,
    start: startMs,
    end: endMs,
    taskId: taskId || null,
    clockStyle,
    date: new Date().toISOString()
  }]);
}


function GuzeyClockDisplay({ toggleSelector, onBreakStatus, isPaused }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let raf;
    const loop = () => {
      setNow(new Date());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const h = now.getHours();
  const min = now.getMinutes();

  let state = "";
  let nextMin = 0;
  let color = "var(--fg)";
  const isLongBreak = (h % 3 === 0);

  if (isLongBreak && min < 35) {
    state = "LONG_BREAK";
    nextMin = 35;
    color = "var(--tag-green)";
  } else {
    if (min >= 0 && min < 5) {
      state = "BREAK";
      nextMin = 5;
      color = "var(--tag-green)";
    } else if (min >= 5 && min < 30) {
      state = "WORK";
      nextMin = 30;
      color = "var(--fg)";
    } else if (min >= 30 && min < 35) {
      state = "BREAK";
      nextMin = 35;
      color = "var(--tag-green)";
    } else {
      state = "WORK";
      nextMin = 60;
      color = "var(--fg)";
    }
  }

  let target = new Date(now);
  target.setSeconds(0);
  target.setMilliseconds(0);
  if (nextMin === 60) {
    target.setMinutes(0);
    target.setHours(target.getHours() + 1);
  } else {
    target.setMinutes(nextMin);
  }

  const remainingMs = target.getTime() - now.getTime();
  const remS = Math.floor(remainingMs / 1000);
  const remM = Math.floor(remS / 60);
  const finalS = remS % 60;

  const isBreakNow = state === "BREAK" || state === "LONG_BREAK";
  useEffect(() => {
    if (onBreakStatus) onBreakStatus(isBreakNow);
  }, [isBreakNow, onBreakStatus]);

  return (
    <div className={`stopwatch-display ${isPaused ? '' : 'is-running'}`} onClick={toggleSelector} title="Click to open task selector" style={{ color: isPaused ? 'var(--fg-dim)' : color }}>
      <span className="sw-digits sw-m" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: '0.08em', fontWeight: 400, letterSpacing: '0.12em' }}>{isPaused ? "TRACKING PAUSED" : state}</span>
        <span style={{ fontSize: '0.7em', margin: '2px 0' }}>{PAD2(remM)}:{PAD2(finalS)}</span>
        <span style={{ fontSize: '0.08em', fontWeight: 400, letterSpacing: '0.12em' }}>LEFT</span>
      </span>
    </div>
  );
}

function CounterClockDisplay({ running, isPristine, currentMs, toggle }) {
  const { m } = splitTime(currentMs);
  return (
    <div className={`stopwatch-display ${running ? 'is-running' : ''} ${isPristine ? 'is-pristine' : ''}`} onClick={toggle} title="Click to start/stop">
      <span className="sw-digits sw-m" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPristine ? (
          <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.1em' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : m}
      </span>
    </div>
  );
}

function FlowtimeClockDisplay({ running, isPristine, currentMs, isBreak, breakRemainingMs, toggle }) {
  const { m } = splitTime(currentMs);
  let displayNode;
  
  if (isBreak) {
    const remSecs = Math.max(0, Math.ceil(breakRemainingMs / 1000));
    const remM = Math.floor(remSecs / 60);
    const remS = remSecs % 60;
    const color = remSecs === 0 ? "var(--red)" : "var(--tag-green)";
    displayNode = (
      <span style={{ color, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: '0.08em', fontWeight: 400, letterSpacing: '0.12em' }}>BREAK</span>
        <span style={{ fontSize: '0.7em', margin: '2px 0' }}>{PAD2(remM)}:{PAD2(remS)}</span>
      </span>
    );
  } else {
    displayNode = isPristine ? (
      <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.1em' }}>
        <path d="M8 5v14l11-7z" />
      </svg>
    ) : m;
  }

  return (
    <div className={`stopwatch-display ${running ? 'is-running' : ''} ${isPristine ? 'is-pristine' : ''}`} onClick={toggle} title="Click to start/stop">
      <span className="sw-digits sw-m" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {displayNode}
      </span>
    </div>
  );
}

abstract class ClockStrategy {
  abstract renderDisplay(context: any): React.ReactNode;
  abstract requiresAnimationLoop(context: any): boolean;
  abstract onToggle(context: any): void;
  abstract onTaskSelected(context: any): void;
  abstract onReset(context: any): void;
}

class CounterClockStrategy extends ClockStrategy {
  renderDisplay({ currentMs, running, isPristine, toggle }) {
    return <CounterClockDisplay running={running} isPristine={isPristine} currentMs={currentMs} toggle={toggle} />;
  }

  requiresAnimationLoop({ state }) {
    return state.runningSince != null;
  }

  onToggle({ isPristine, setSelectorOpen, setState, timeLogs, setTimeLogs, activeTask, allowNoTask, settings }) {
    if (isPristine && !activeTask && !allowNoTask) {
      setSelectorOpen(true);
      return;
    }
    setState(s => {
      if (s.runningSince) {
        logWorkSession(setTimeLogs, s.runningSince, Date.now(), activeTask?.id, 'counter');
        return { elapsed: s.elapsed + (Date.now() - s.runningSince), runningSince: null };
      }
      return { ...s, runningSince: Date.now() };
    });
  }

  onTaskSelected({ running, setState, setSelectorOpen }) {
    setSelectorOpen(false);
    if (!running) {
      setState(s => ({ ...s, runningSince: Date.now() }));
    }
  }

  onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }) {
    if (state.runningSince) {
      logWorkSession(setTimeLogs, state.runningSince, Date.now(), activeTask?.id, 'counter');
    }
    setState({ elapsed: 0, runningSince: null });
    setSelectorOpen(false);
  }
}

class FlowtimeClockStrategy extends ClockStrategy {
  renderDisplay({ currentMs, running, isPristine, toggle, state }) {
    let breakRem = 0;
    if (state.isBreak && state.breakStartedAt) {
      breakRem = state.breakAllowedMs - (Date.now() - state.breakStartedAt);
    }
    return <FlowtimeClockDisplay running={running} isPristine={isPristine} currentMs={currentMs} isBreak={state.isBreak} breakRemainingMs={breakRem} toggle={toggle} />;
  }

  requiresAnimationLoop({ state }) {
    return state.runningSince != null || state.isBreak;
  }

  onToggle({ isPristine, setSelectorOpen, setState, timeLogs, setTimeLogs, activeTask, allowNoTask, settings }) {
    if (isPristine && !activeTask && !allowNoTask) {
      setSelectorOpen(true);
      return;
    }
    setState(s => {
      if (s.isBreak) return s; // can't pause in break (feature not a bug)
      
      if (s.runningSince) {
        logWorkSession(setTimeLogs, s.runningSince, Date.now(), activeTask?.id, 'flowtime');
        return { ...s, elapsed: s.elapsed + (Date.now() - s.runningSince), runningSince: null };
      }
      return { ...s, runningSince: Date.now() };
    });
  }

  onTaskSelected({ running, setState, setSelectorOpen, state }) {
    setSelectorOpen(false);
    if (!running && !state.isBreak) {
      setState(s => ({ ...s, runningSince: Date.now() }));
    }
  }

  onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }) {
    if (state.runningSince && !state.isBreak) {
      logWorkSession(setTimeLogs, state.runningSince, Date.now(), activeTask?.id, 'flowtime');
    }
    setState({ elapsed: 0, runningSince: null, isBreak: false, breakAllowedMs: 0, breakStartedAt: null });
    setSelectorOpen(false);
  }
}

class GuzeyClockStrategy extends ClockStrategy {
  renderDisplay({ toggle, onBreakStatus, state }) {
    return <GuzeyClockDisplay toggleSelector={toggle} onBreakStatus={onBreakStatus} isPaused={!state.runningSince} />;
  }

  requiresAnimationLoop() {
    return false;
  }

  onToggle({ state, setState, setTimeLogs, activeTask }) {
    setState(s => {
      if (s.runningSince) {
        logWorkSession(setTimeLogs, s.runningSince, Date.now(), activeTask?.id, 'guzey');
        return { ...s, runningSince: null };
      } else {
        return { ...s, runningSince: Date.now() };
      }
    });
  }

  onTaskSelected({ setSelectorOpen, setState }) {
    setSelectorOpen(false);
    setState(s => ({ ...s, runningSince: Date.now() }));
  }

  onReset({ setSelectorOpen, setState, setTimeLogs, activeTask, state }) {
    if (state.runningSince) {
      logWorkSession(setTimeLogs, state.runningSince, Date.now(), activeTask?.id, 'guzey');
    }
    setState(s => ({ ...s, runningSince: null }));
    setSelectorOpen(false);
  }
}

export const CLOCK_STRATEGIES: Record<string, ClockStrategy> = {
  counter: new CounterClockStrategy(),
  flowtime: new FlowtimeClockStrategy(),
  guzey: new GuzeyClockStrategy(),
};


export function Stopwatch({ onBreakStatusChange }) {
  const [state, setState] = useStored('stopwatch', { elapsed: 0, runningSince: null, isBreak: false, breakAllowedMs: 0, breakStartedAt: null, breakSoundPlayed: false });
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events] = useStored('events', SAMPLE_EVENTS || []);
  const [settings] = useStored<any>('settings', {});
  const [timeLogs, setTimeLogs] = useStored('time_logs', []);
  
  const strategy = CLOCK_STRATEGIES[settings.clockStyle] || CLOCK_STRATEGIES.counter;

  const [tick, setTick] = useState(0);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [stagedTaskId, setStagedTaskId] = useState<string | null>(null);

  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio('/wine-glass-alarm.ogg');
  }

  useEffect(() => {
    if (selectorOpen) {
      setVisible(true);
      setIsClosing(false);
      setStagedTaskId(null);
      setSearchQuery('');
    } else if (visible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsClosing(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectorOpen, visible]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const active = tasks && tasks.find(t => t.status === 'doing');
    if (!active && !settings.allowStopwatchWithoutTask) {
      setSelectorOpen(true);
    }
  }, [tasks, settings.allowStopwatchWithoutTask]);


  // While running, request animation frame to update display.
  useEffect(() => {
    let raf;
    const loop = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    if (strategy.requiresAnimationLoop({ state })) {
      raf = requestAnimationFrame(loop);
    }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [strategy, state.runningSince, state.isBreak]);

  useEffect(() => {
    if (state.isBreak && state.breakStartedAt && !state.breakSoundPlayed) {
      if (Date.now() - state.breakStartedAt >= state.breakAllowedMs) {
        audioRef.current?.play().catch(e => console.error("Sound play failed", e));
        setState(s => ({ ...s, breakSoundPlayed: true }));
      }
    }
  }, [tick, state.isBreak, state.breakStartedAt, state.breakAllowedMs, state.breakSoundPlayed]);

  const running = state.runningSince != null;
  const currentMs = state.elapsed + (running && !state.isBreak ? Date.now() - state.runningSince : 0);
  const isPristine = currentMs === 0 && !running && !state.isBreak;
  const activeTask = tasks?.find(t => t.status === 'doing');
  const allowNoTask = !!settings.allowStopwatchWithoutTask;

  const toggle = () => strategy.onToggle({
    state, setState,
    selectorOpen, setSelectorOpen,
    running, isPristine, currentMs,
    timeLogs, setTimeLogs, activeTask, allowNoTask, settings
  });

  const reset = () => strategy.onReset({
    state, setState,
    selectorOpen, setSelectorOpen,
    running, isPristine, currentMs,
    timeLogs, setTimeLogs, activeTask, allowNoTask, settings
  });

  const startWithTask = (taskId) => {
    setTasks(ts => ts.map(t => {
       if (t.id === taskId) return { ...t, status: 'doing' };
       if (t.status === 'doing') return { ...t, status: 'todo' };
       return t;
    }));
    setSearchQuery('');
    strategy.onTaskSelected({
      state, setState,
      selectorOpen, setSelectorOpen,
      running, isPristine, currentMs,
      timeLogs, setTimeLogs, activeTask, allowNoTask, settings
    });
  };

  const startBreak = () => {
    if (settings.clockStyle === 'flowtime') {
      setState(s => {
        if (s.isBreak) {
          // End break
          return { ...s, isBreak: false, elapsed: 0, runningSince: Date.now() };
        } else {
          // Start break
          if (s.runningSince) logWorkSession(setTimeLogs, s.runningSince, Date.now(), activeTask?.id, 'flowtime');
          const elapsed = s.elapsed + (s.runningSince ? Date.now() - s.runningSince : 0);
          const div = settings.flowtimeBreakDivisor || 5;
          return { ...s, isBreak: true, breakAllowedMs: elapsed / div, breakStartedAt: Date.now(), runningSince: null, elapsed: 0, breakSoundPlayed: false };
        }
      });
    }
  };

  // Keyboard shortcut: space to toggle, r to reset, enter to switch
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input:not(.task-search-input), textarea, [contenteditable]')) return;
      
      if (e.shiftKey && e.code === 'ShiftRight' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
        // We'll just check if shift is held and another shift is pressed, but LShift+RShift is hard to reliably detect cross-browser.
        // A common approximation: if ShiftLeft and ShiftRight are both pressed... wait, the browser just fires Shift.
      }
      
      if (e.code === 'Space' && !selectorOpen) { e.preventDefault(); toggle(); }
      else if (e.code === 'KeyR' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reset(); }
      else if (e.code === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSelectorOpen(prev => !prev); }
      else if (e.code === 'Escape' && selectorOpen) { 
        if (activeTask || allowNoTask) {
          e.preventDefault(); setSelectorOpen(false); 
        }
      }
    };
    
    // For LShift+RShift
    const pressed = new Set();
    const handleDown = (e) => {
      if (e.target.matches('input:not(.task-search-input), textarea, [contenteditable]')) return;
      pressed.add(e.code);
      if (pressed.has('ShiftLeft') && pressed.has('ShiftRight')) {
        e.preventDefault();
        startBreak();
      }
    };
    const handleUp = (e) => {
      pressed.delete(e.code);
    };
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [selectorOpen, isPristine, strategy, state, activeTask, allowNoTask, settings]);

  useEffect(() => {
    if (selectorOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectorOpen]);

  const sortedTasks = useMemo(() => {
    const todayStr = ymd(new Date());
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let filtered = (tasks || []).filter(t => t.status !== 'done' && t.status !== 'doing');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => (t.title || '').toLowerCase().includes(q));
    }

    const safeEvents = events || [];

    return [...filtered].sort((a, b) => {
      const aEvents = safeEvents.filter(e => e.taskId === a.id && (e.date === todayStr || e.endDate === todayStr));
      const bEvents = safeEvents.filter(e => e.taskId === b.id && (e.date === todayStr || e.endDate === todayStr));

      const aThisHour = aEvents.some(e => (e.start || 0) <= nowMin && ((e.end || 0) >= nowMin || (e.start || 0) + 60 >= nowMin));
      const bThisHour = bEvents.some(e => (e.start || 0) <= nowMin && ((e.end || 0) >= nowMin || (e.start || 0) + 60 >= nowMin));

      if (aThisHour !== bThisHour) return aThisHour ? -1 : 1;

      const aToday = aEvents.length > 0 || a.due === todayStr;
      const bToday = bEvents.length > 0 || b.due === todayStr;

      if (aToday !== bToday) return aToday ? -1 : 1;

      return (a.title || '').localeCompare(b.title || '');
    });
  }, [tasks, events, searchQuery]);

  return (
    <section className="stopwatch-hero">
      <div className="stopwatch-stage" style={{ position: 'relative' }}>

        {strategy.renderDisplay({ currentMs, running, isPristine, toggle, onBreakStatus: onBreakStatusChange, state })}
        
        {(() => {
          const isGuzey = settings.clockStyle === 'guzey';
          const isFlowBreak = state.isBreak;
          const shouldShowTask = activeTask && (running || isGuzey || isFlowBreak);
          if (shouldShowTask) {
            return (
              <div 
                onClick={(e) => { e.stopPropagation(); setSelectorOpen(true); }}
                style={{ 
                  marginTop: '16px', fontSize: '18px', color: 'var(--fg)', textAlign: 'center', 
                  cursor: 'pointer', transition: 'color 0.15s', padding: '4px 12px', borderRadius: '4px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                title="Click to change task"
              >
                <span style={{ color: 'var(--fg-dim)', marginRight: '8px' }}>Working on:</span>
                <span style={{ fontWeight: 400 }}>{activeTask.title}</span>
              </div>
            );
          } else if (allowNoTask && !activeTask && (running || isGuzey || isFlowBreak)) {
            return (
              <div style={{ marginTop: '16px', fontSize: '18px', color: 'var(--fg-dim)', textAlign: 'center' }}>
                No active task.
              </div>
            );
          }
          return null;
        })()}

        {visible && (
          <>
            {(!activeTask && !allowNoTask) ? (
              <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            ) : (
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                onClick={(e) => { e.stopPropagation(); setSelectorOpen(false); }}
              />
            )}
            
            {((tasks || []).filter(t => t.status !== 'done' && t.status !== 'doing').length === 0) ? (
              <div className={`task-selector-overlay ${isClosing ? 'is-closing' : 'floating-menu'}`} style={{
                position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
              }}>
                <div style={{ color: 'var(--fg-dim)', fontSize: '24px', pointerEvents: 'auto', textAlign: 'center' }}>
                  Create some tasks to start working on them.
                </div>
              </div>
            ) : (
              <div className={`task-selector-overlay ${isClosing ? 'is-closing' : 'floating-menu'}`} style={{
                position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
              }}>
                <style>{`
                  .modern-task-input::placeholder {
                    color: var(--fg-dim);
                    opacity: 0.5;
                  }
                  .modern-task-item {
                    cursor: pointer;
                    font-size: 18px;
                    color: var(--fg-dim);
                    padding: 8px 16px;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    text-align: center;
                    width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }
                  .modern-task-item:hover {
                    color: var(--fg);
                    transform: scale(1.05);
                  }
                  .modern-task-list::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div style={{ width: '100%', maxWidth: '800px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input 
                    ref={searchInputRef}
                    autoFocus
                    className="modern-task-input"
                    style={{ 
                      background: 'transparent', border: 'none', outline: 'none', 
                      width: '100%', fontSize: '32px', textAlign: 'center', fontWeight: 300,
                      color: stagedTaskId ? 'var(--tag-gold)' : 'var(--fg)'
                    }}
                    placeholder="Type a task"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (stagedTaskId) setStagedTaskId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (stagedTaskId) {
                          startWithTask(stagedTaskId);
                        } else if (sortedTasks.length > 0) {
                          setStagedTaskId(sortedTasks[0].id);
                          setSearchQuery(sortedTasks[0].title);
                        }
                      } else if (e.key === 'Escape') {
                        if (stagedTaskId) {
                          setStagedTaskId(null);
                          setSearchQuery('');
                          e.stopPropagation();
                        }
                      }
                    }}
                  />
                  
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '24px 0', height: '1px',
                    width: (stagedTaskId || searchQuery.trim().length > 0) ? '400px' : '100px',
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease',
                    background: stagedTaskId 
                      ? 'linear-gradient(90deg, transparent, var(--tag-gold), transparent)'
                      : 'linear-gradient(90deg, transparent, var(--fg-dim), transparent)',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: stagedTaskId ? 'var(--tag-gold)' : 'var(--fg-dim)',
                      position: 'absolute',
                      transition: 'background 0.4s ease'
                    }} />
                  </div>
                  
                  <div className="modern-task-list" style={{ width: '100%', maxHeight: '40vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollbarWidth: 'none' }}>
                    {stagedTaskId ? (
                      <button
                        onClick={() => startWithTask(stagedTaskId)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--tag-gold)',
                          color: 'var(--tag-gold)',
                          fontSize: '16px',
                          padding: '10px 32px',
                          borderRadius: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginTop: '8px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tag-gold)'; e.currentTarget.style.color = 'var(--bg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tag-gold)'; }}
                      >
                        Start working
                      </button>
                    ) : (
                      <>
                        {sortedTasks.length === 0 ? (
                          <div style={{ color: 'var(--fg-dim)', fontSize: '16px', marginTop: '16px' }}>
                            No tasks match your search.
                          </div>
                        ) : (
                          sortedTasks.map(t => (
                            <div key={t.id} className="modern-task-item" onClick={() => {
                              setStagedTaskId(t.id);
                              setSearchQuery(t.title);
                              if (searchInputRef.current) searchInputRef.current.focus();
                            }}>
                              {t.title}
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

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


