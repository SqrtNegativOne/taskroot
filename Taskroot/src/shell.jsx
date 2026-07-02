// Shared top bar + clickable stage indicator. Used across Plan, Do, Rest.

function TopBar({ current, today }) {
  const day = DOW_SHORT[(today.getDay() + 6) % 7];
  const dateStr = `${day} ${MONTHS[today.getMonth()]} ${PAD2(today.getDate())} ${today.getFullYear()}`;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <a className="logo" href="Taskroot - Plan.html">
          <span className="logo-bracket">▌</span>
          <span className="logo-name">TASKROOT</span>
        </a>
        <span className="topbar-sep">·</span>
        <span className="topbar-date">{dateStr.toLowerCase()}</span>
      </div>
      <div className="topbar-right">
        <StageIndicator current={current} />
      </div>
    </header>
  );
}

function StageIndicator({ current }) {
  const stages = [
    { key: 'plan', label: 'plan', href: 'Taskroot - Plan.html' },
    { key: 'do',   label: 'do',   href: 'Taskroot - Do.html' },
    { key: 'rest', label: 'rest', href: 'Taskroot - Rest.html' },
  ];
  return (
    <nav className="stages" aria-label="Stages">
      <span className="stages-label">stage</span>
      <span className="stages-arrow">›</span>
      {stages.map((s, i) => (
        <React.Fragment key={s.key}>
          <a
            href={s.href}
            className={`stage ${current === s.key ? 'is-current' : ''}`}
            aria-current={current === s.key ? 'page' : undefined}
          >
            <span className="stage-dot">{current === s.key ? '●' : '○'}</span>
            <span className="stage-name">{s.label}</span>
          </a>
          {i < stages.length - 1 && <span className="stage-sep">─</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

Object.assign(window, { TopBar, StageIndicator });
