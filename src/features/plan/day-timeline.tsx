import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { TODAY, ymd, hhmmShort, durationLabel, MONTHS, DOW_SHORT, PAD2, addDays, sameDay } from '../../core/data';
import { hydrateEvents } from '../../core/events';

// Day timeline: vertical, 24h scrollable, with drag-to-schedule + resize.

const PX_PER_MIN = 56 / 60; // 56 px per hour
const SNAP_MIN = 15;

function DayTimeline({ events, tasks, today, timelineDate, setTimelineDate, dragState, setDragState, onDropToTime, onResizeEvent, onMoveEvent, onEventClick, onAddEvent }) {
  const containerRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  
  const viewDate = timelineDate || today;
  const isToday = sameDay(viewDate, today);

  const [createPreview, setCreatePreview] = React.useState(null);

  // Scroll to ~7am on first mount (after layout settles)
  React.useEffect(() => {
    const tick = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 7 * 60 * PX_PER_MIN - 12;
      }
    };
    tick();
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  // Current-time line
  const [nowMin, setNowMin] = React.useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const todayEvents = hydrateEvents(events.filter(e => {
    const cellDate = ymd(viewDate);
    const inRange = e.endDate ? (cellDate >= e.date && cellDate <= e.endDate) : (e.date === cellDate);
    return inRange && !e.isAllDay;
  }), tasks).sort((a, b) => a.start - b.start);

  // Compute lanes for overlapping events
  const laid = layoutEvents(todayEvents);

  // Drop preview info
  const dropPreview = dragState?.target?.kind === 'day-time' ? dragState.target : null;

  const onGridPointerDown = (e) => {
    if (e.target.closest('.day-event') || e.target.closest('.day-now')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    
    const grid = containerRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const startY = e.clientY - rect.top;
    const startMin = Math.round((startY / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
    
    let active = false;
    
    const move = (ev) => {
      active = true;
      const currentY = ev.clientY - rect.top;
      const moveMin = Math.round((currentY / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
      const s = Math.min(startMin, moveMin);
      const eMin = Math.max(startMin, moveMin);
      setCreatePreview({ start: s, end: eMin === s ? s + SNAP_MIN : eMin });
    };
    
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (active) {
        setCreatePreview(prev => {
          if (prev && onAddEvent) {
             onAddEvent(timelineDate, prev.start, prev.end);
          }
          return null;
        });
      } else {
        if (onAddEvent) {
          onAddEvent(timelineDate, startMin, startMin + 60);
        }
      }
    };
    
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <section className="day-pane">
      <header className="cal-hd">
        <div className="cal-hd-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="cal-nav-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)' }} onClick={() => setTimelineDate(addDays(viewDate, -1))}>◀</button>
          <span className="cal-hd-title" style={{ color: isToday ? 'inherit' : 'var(--accent)' }}>
            {DOW_SHORT[viewDate.getDay()]} {MONTHS[viewDate.getMonth()]} {viewDate.getDate()}
          </span>
          <button className="cal-nav-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)' }} onClick={() => setTimelineDate(addDays(viewDate, 1))}>▶</button>
          {!isToday && (
            <button className="cal-nav-btn" style={{ border: '1px solid var(--border)', padding: '2px 8px', background: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: '11px', marginLeft: '8px', borderRadius: '4px' }} onClick={() => setTimelineDate(today)}>Today</button>
          )}
        </div>
      </header>

      <div className="day-scroll" ref={scrollRef}>
        <div
          className="day-grid"
          ref={containerRef}
          style={{ height: `${24 * 60 * PX_PER_MIN}px` }}
          data-drop-kind="day-time"
          onPointerDown={onGridPointerDown}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="day-hour" style={{ top: `${h * 60 * PX_PER_MIN}px`, height: `${60 * PX_PER_MIN}px` }}>
              <span className="day-hour-label">{PAD2(h)}:00</span>
              <div className="day-hour-line" />
              <div className="day-hour-half" />
            </div>
          ))}

          {/* Now line */}
          {isToday && (
            <div className="day-now" style={{ top: `${nowMin * PX_PER_MIN}px` }}>
              <span className="day-now-label">now {hhmmShort(nowMin)}</span>
              <div className="day-now-line" />
            </div>
          )}

          {/* Events */}
          {laid.map(({ event, lane, lanes }) => (
            <EventBlock
              key={event.id}
              event={event}
              task={event.task}
              lane={lane}
              lanes={lanes}
              onResize={onResizeEvent}
              onMove={onMoveEvent}
              dragState={dragState}
              setDragState={setDragState}
              onEventClick={onEventClick}
            />
          ))}

          {/* Create preview */}
          {createPreview && (
            <div className="day-event ev-plan is-compact" style={{
              top: `${createPreview.start * PX_PER_MIN}px`,
              height: `${(createPreview.end - createPreview.start) * PX_PER_MIN}px`,
              left: '56px',
              width: 'calc(100% - 58px)',
              opacity: 0.5,
              pointerEvents: 'none',
              zIndex: 10
            }}>
               <div className="day-event-inner">
                 <div className="day-event-time">{hhmmShort(createPreview.start)} – {hhmmShort(createPreview.end)}</div>
                 <div className="day-event-title">New Event...</div>
               </div>
            </div>
          )}

          {/* Drop preview */}
          {dropPreview && (
            <div
              className="day-drop-preview"
              style={{
                top: `${dropPreview.minute * PX_PER_MIN}px`,
                height: `${(dropPreview.duration || 60) * PX_PER_MIN}px`,
              }}
            >
              <span className="day-drop-preview-label">
                ▸ {hhmmShort(dropPreview.minute)} – {hhmmShort(dropPreview.minute + (dropPreview.duration || 60))}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EventBlock({ event, task, lane, lanes, onResize, onMove, dragState, setDragState, onEventClick }) {
  const top = event.start * PX_PER_MIN;
  const height = (event.end - event.start) * PX_PER_MIN;
  const widthPct = 100 / lanes;
  const leftPct = lane * widthPct;

  const title = event.title;
  const pri = event.priority;

  const onResizeStart = (edge) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startStart = event.start;
    const startEnd = event.end;
    const move = (ev) => {
      const dy = ev.clientY - startY;
      const dm = Math.round((dy / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
      if (edge === 'bottom') {
        const newEnd = Math.max(startStart + SNAP_MIN, Math.min(24 * 60, startEnd + dm));
        onResize(event.id, startStart, newEnd);
      } else {
        const newStart = Math.max(0, Math.min(startEnd - SNAP_MIN, startStart + dm));
        onResize(event.id, newStart, startEnd);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onBodyDown = (e) => {
    if (e.target.closest('.day-event-handle')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const startStart = event.start;
    const startEnd = event.end;
    let moved = false;
    const move = (ev) => {
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;
      moved = true;
      const dm = Math.round((dy / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
      const dur = startEnd - startStart;
      const newStart = Math.max(0, Math.min(24 * 60 - dur, startStart + dm));
      onMove(event.id, newStart, newStart + dur);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) {
        onEventClick && onEventClick(event);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const compact = height < 40;
  const isDone = event.isDone;

  return (
    <div
      className={`day-event ev-${event.type} ${pri ? `pri-bar-${pri}` : ''} ${compact ? 'is-compact' : ''} ${isDone ? 'is-done' : ''}`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 18)}px`,
        left: `calc(${leftPct}% + 56px)`,
        width: `calc(${widthPct}% - 58px)`,
      }}
      onPointerDown={onBodyDown}
    >
      <div className="day-event-handle day-event-handle-top" onPointerDown={onResizeStart('top')} />
      <div className="day-event-inner">
        <div className="day-event-time">{hhmmShort(event.start)} – {hhmmShort(event.end)}</div>
        <div className="day-event-title">
          {pri && <span className={`pri pri-${pri}`}>●</span>}
          {title}
        </div>
        {!compact && event.type === 'plan' && task && task.tags.length > 0 && (
          <div className="day-event-tags">
            {task.tags.map(t => <span key={t} className="day-event-tag">#{t}</span>)}
          </div>
        )}
      </div>
      <div className="day-event-handle day-event-handle-bottom" onPointerDown={onResizeStart('bottom')}>
        <span className="day-event-handle-grip">═</span>
      </div>
    </div>
  );
}

// Simple overlap layout: assign each event to the earliest lane that's free.
function layoutEvents(events) {
  const placed = [];
  const result = [];
  for (const ev of events) {
    let lane = 0;
    while (placed.some(p => p.lane === lane && !(p.end <= ev.start || p.start >= ev.end))) {
      lane++;
    }
    placed.push({ start: ev.start, end: ev.end, lane });
    result.push({ event: ev, lane });
  }
  // Determine total lanes per cluster (events that overlap any chain)
  // For simplicity, use max lanes among overlapping events.
  return result.map(r => {
    let maxLane = r.lane;
    for (const p of placed) {
      if (!(p.end <= r.event.start || p.start >= r.event.end)) {
        if (p.lane > maxLane) maxLane = p.lane;
      }
    }
    return { ...r, lanes: maxLane + 1 };
  });
}

export { DayTimeline, PX_PER_MIN, SNAP_MIN };
