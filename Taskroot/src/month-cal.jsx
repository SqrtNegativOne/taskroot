// Month / week calendar — top of right pane.

function MonthCalendar({ view, setView, anchor, setAnchor, events, tasks, today, dragState, onDropToDate }) {
  // anchor is a Date pointing into the month or week currently shown.
  const isWeek = view === 'week';
  const cells = React.useMemo(() => buildMonthOrWeekCells(anchor, isWeek), [anchor, isWeek]);

  const titleLabel = isWeek
    ? weekRangeLabel(cells[0].date, cells[cells.length - 1].date)
    : `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const shift = (n) => {
    const d = new Date(anchor);
    if (isWeek) d.setDate(d.getDate() + 7 * n);
    else d.setMonth(d.getMonth() + n);
    setAnchor(d);
  };

  return (
    <section className="month-pane">
      <header className="cal-hd">
        <div className="cal-hd-left">
          <span className="bracket">┌─</span>
          <span className="cal-hd-title">{titleLabel}</span>
          <span className="bracket">─┐</span>
        </div>
        <div className="cal-hd-right">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={() => shift(-1)} aria-label="previous">←</button>
            <button className="cal-nav-btn" onClick={() => setAnchor(new Date(today))}>today</button>
            <button className="cal-nav-btn" onClick={() => shift(1)} aria-label="next">→</button>
          </div>
          <div className="seg">
            <button className={`seg-btn ${!isWeek ? 'is-active' : ''}`} onClick={() => setView('month')}>month</button>
            <button className={`seg-btn ${isWeek ? 'is-active' : ''}`} onClick={() => setView('week')}>week</button>
          </div>
        </div>
      </header>

      <div className={`cal-grid ${isWeek ? 'is-week' : 'is-month'}`}>
        <div className="cal-dow">
          {DOW_SHORT.map(d => (
            <div key={d} className="cal-dow-cell">{d.toLowerCase()}</div>
          ))}
        </div>
        <div className={`cal-cells ${isWeek ? 'is-week' : 'is-month'}`}>
          {cells.map((c, i) => (
            <DayCell
              key={i}
              cell={c}
              today={today}
              events={events.filter(e => e.date === ymd(c.date))}
              tasks={tasks}
              isWeek={isWeek}
              dragState={dragState}
              onDropToDate={onDropToDate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DayCell({ cell, today, events, tasks, isWeek, dragState, onDropToDate }) {
  const ref = React.useRef(null);
  const isToday = sameDay(cell.date, today);
  const isPast = cell.date < today && !isToday;
  const isDragOver = dragState?.target?.kind === 'month-day' && dragState.target.date === ymd(cell.date);
  const canAccept = !!dragState;

  React.useEffect(() => {
    if (!dragState) return;
    const el = ref.current;
    if (!el) return;
    el.dataset.dropDate = ymd(cell.date);
    el.dataset.dropKind = 'month-day';
  }, [dragState, cell.date]);

  return (
    <div
      ref={ref}
      data-drop-kind="month-day"
      data-drop-date={ymd(cell.date)}
      className={[
        'day-cell',
        cell.outOfMonth ? 'is-out' : '',
        isToday ? 'is-today' : '',
        isPast ? 'is-past' : '',
        isWeek ? 'is-week' : '',
        isDragOver ? 'is-drag-over' : '',
        canAccept ? 'can-accept' : '',
      ].join(' ')}
    >
      <div className="day-cell-hd">
        <span className="day-cell-num">{PAD2(cell.date.getDate())}</span>
        {isToday && <span className="day-cell-today-flag">·today</span>}
      </div>
      <div className="day-cell-events">
        {events.slice(0, isWeek ? 12 : 4).map(ev => {
          const task = ev.taskId ? tasks.find(t => t.id === ev.taskId) : null;
          const title = task ? task.title : ev.title;
          const pri = task ? task.priority : null;
          return (
            <div
              key={ev.id}
              className={`day-cell-event ev-${ev.type} ${pri ? `pri-bar-${pri}` : ''}`}
              title={`${hhmmShort(ev.start)} — ${title}`}
            >
              <span className="day-cell-event-time">{hhmmShort(ev.start)}</span>
              <span className="day-cell-event-title">{title}</span>
            </div>
          );
        })}
        {events.length > (isWeek ? 12 : 4) && (
          <div className="day-cell-more">+{events.length - (isWeek ? 12 : 4)} more</div>
        )}
      </div>
      {isDragOver && (
        <div className="day-cell-drop-hint">
          <span className="bracket">▸</span> drop to plan
        </div>
      )}
    </div>
  );
}

function buildMonthOrWeekCells(anchor, isWeek) {
  if (isWeek) {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => ({
      date: addDays(start, i),
      outOfMonth: false,
    }));
  }
  // Month: 6 rows × 7 cols, leading from previous month
  const first = startOfMonth(anchor);
  const start = startOfWeek(first);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    cells.push({ date: d, outOfMonth: d.getMonth() !== anchor.getMonth() });
  }
  return cells;
}

function weekRangeLabel(a, b) {
  if (a.getMonth() === b.getMonth()) {
    return `${MONTHS_LONG[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
  }
  return `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}

Object.assign(window, { MonthCalendar });
