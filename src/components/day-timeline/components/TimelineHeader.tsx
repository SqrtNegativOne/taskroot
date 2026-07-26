import { MONTHS, DOW_SHORT, addDays } from "../../../core/store/data";

interface TimelineHeaderProps {
    viewDate: Date;
    isToday: boolean;
    today: Date;
    setTimelineDate: (d: Date) => void;
    filterMenu?: React.ReactNode;
}

export function TimelineHeader({
    viewDate,
    isToday,
    today,
    setTimelineDate,
    filterMenu,
}: TimelineHeaderProps) {
    return (
        <header className="cal-hd">
            <div
                className="cal-hd-left"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                <button
                    className="cal-nav-btn"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--fg-dim)",
                    }}
                    onClick={() => setTimelineDate(addDays(viewDate, -1))}
                >
                    ◀
                </button>
                <span
                    className="cal-hd-title"
                    style={{ color: isToday ? "inherit" : "var(--accent)" }}
                >
                    {DOW_SHORT[viewDate.getDay()]} {MONTHS[viewDate.getMonth()]} {viewDate.getDate()}
                </span>
                <button
                    className="cal-nav-btn"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--fg-dim)",
                    }}
                    onClick={() => setTimelineDate(addDays(viewDate, 1))}
                >
                    ▶
                </button>
                {!isToday && (
                    <button
                        className="cal-nav-btn"
                        style={{
                            border: "1px solid var(--border)",
                            padding: "2px 8px",
                            background: "none",
                            color: "var(--fg-dim)",
                            cursor: "pointer",
                            fontSize: "11px",
                            marginLeft: "8px",
                            borderRadius: "4px",
                        }}
                        onClick={() => setTimelineDate(today)}
                    >
                        Today
                    </button>
                )}
            </div>
            <div className="cal-hd-right">{filterMenu}</div>
        </header>
    );
}
