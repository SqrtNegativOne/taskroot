import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SAMPLE_TASKS, SAMPLE_EVENTS, PAD2, ymd } from '../../core/data';
import { useStored } from '../../core/store';
import { Search } from 'lucide-react';

function GuzeyClockDisplay({ toggleSelector }) {
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

  const displayText = `${state}: ${PAD2(remM)}:${PAD2(finalS)} left`;

  return (
    <div className="stopwatch-display is-running" onClick={toggleSelector} title="Click to open task selector" style={{ color }}>
      <span className="sw-digits sw-m" style={{ fontSize: '0.28em', whiteSpace: 'nowrap' }}>
        {displayText}
      </span>
    </div>
  );
}

function ClassicClockDisplay({ running, isPristine, currentMs, toggle }) {
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

abstract class ClockStrategy {
  abstract renderDisplay(context: any): React.ReactNode;
  abstract requiresAnimationLoop(context: any): boolean;
  abstract onToggle(context: any): void;
  abstract onTaskSelected(context: any): void;
  abstract onReset(context: any): void;
}

class ClassicClockStrategy extends ClockStrategy {
  renderDisplay({ currentMs, running, isPristine, toggle }) {
    return <ClassicClockDisplay running={running} isPristine={isPristine} currentMs={currentMs} toggle={toggle} />;
  }

  requiresAnimationLoop({ state }) {
    return state.runningSince != null;
  }

  onToggle({ isPristine, setSelectorOpen, setState }) {
    if (isPristine) {
      setSelectorOpen(true);
      return;
    }
    setState(s => {
      if (s.runningSince) {
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

  onReset({ setState, setSelectorOpen }) {
    setState({ elapsed: 0, runningSince: null });
    setSelectorOpen(false);
  }
}

class GuzeyClockStrategy extends ClockStrategy {
  renderDisplay({ toggle }) {
    return <GuzeyClockDisplay toggleSelector={toggle} />;
  }

  requiresAnimationLoop() {
    return false;
  }

  onToggle({ setSelectorOpen }) {
    setSelectorOpen(prev => !prev);
  }

  onTaskSelected({ setSelectorOpen }) {
    setSelectorOpen(false);
  }

  onReset({ setSelectorOpen }) {
    setSelectorOpen(false);
  }
}

const CLOCK_STRATEGIES = {
  classic: new ClassicClockStrategy(),
  guzey: new GuzeyClockStrategy(),
};


function Stopwatch() {
  const [state, setState] = useStored('stopwatch', { elapsed: 0, runningSince: null });
  const [tasks, setTasks] = useStored('tasks', SAMPLE_TASKS);
  const [events] = useStored('events', SAMPLE_EVENTS || []);
  const [settings] = useStored('settings', {});
  
  const strategy = CLOCK_STRATEGIES[settings.clockStyle] || CLOCK_STRATEGIES.classic;

  const [, setTick] = useState(0);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // While running, request animation frame to update display.
  useEffect(() => {
    if (!strategy.requiresAnimationLoop({ state })) return;
    let raf;
    const loop = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [strategy, state.runningSince]);

  const running = state.runningSince != null;
  const currentMs = state.elapsed + (running ? Date.now() - state.runningSince : 0);
  const isPristine = currentMs === 0 && !running;

  const toggle = () => strategy.onToggle({
    state, setState,
    selectorOpen, setSelectorOpen,
    running, isPristine, currentMs
  });

  const reset = () => strategy.onReset({
    state, setState,
    selectorOpen, setSelectorOpen,
    running, isPristine, currentMs
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
      running, isPristine, currentMs
    });
  };

  // Keyboard shortcut: space to toggle, r to reset, enter to switch
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input:not(.task-search-input), textarea, [contenteditable]')) return;
      if (e.code === 'Space' && !selectorOpen) { e.preventDefault(); toggle(); }
      else if (e.code === 'KeyR' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reset(); }
      else if (e.code === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSelectorOpen(prev => !prev); }
      else if (e.code === 'Escape' && selectorOpen) { e.preventDefault(); setSelectorOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectorOpen, isPristine, strategy, state.elapsed, state.runningSince]);

  useEffect(() => {
    if (selectorOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectorOpen]);

  const sortedTasks = useMemo(() => {
    const todayStr = ymd(new Date());
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let filtered = tasks || [];
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

        {strategy.renderDisplay({ currentMs, running, isPristine, toggle })}

        {selectorOpen && (
          <div className="task-selector-overlay" style={{
            position: 'absolute', top: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '12px', width: '360px', zIndex: 100,
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px',
            maxHeight: '400px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-base)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <Search size={16} style={{ marginRight: '8px', color: 'var(--fg-dim)' }} />
              <input 
                ref={searchInputRef}
                className="task-search-input"
                style={{ background: 'transparent', border: 'none', color: 'var(--fg)', outline: 'none', width: '100%', fontSize: '15px' }}
                placeholder="Search task to start..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && sortedTasks.length > 0) {
                    startWithTask(sortedTasks[0].id);
                  }
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingRight: '4px' }}>
              {sortedTasks.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-dim)', fontSize: '14px' }}>
                  No tasks match your search.
                </div>
              ) : (
                sortedTasks.map(t => (
                  <div key={t.id} onClick={() => startWithTask(t.id)} style={{
                    padding: '10px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)',
                    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
                    display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, transform 0.1s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span className={`pri pri-${t.priority}`}>●</span>
                       <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{t.title}</span>
                       {t.status === 'doing' && <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 6px', background: 'var(--accent)', color: 'var(--bg-base)', borderRadius: '4px', fontWeight: 'bold' }}>DOING</span>}
                    </div>
                    {t.tags && t.tags.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--fg-dim)', marginTop: '6px' }}>
                        {t.tags.map(tag => <span key={tag} style={{ marginRight: '8px' }}>#{tag}</span>)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
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

export { Stopwatch };
