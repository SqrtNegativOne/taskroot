import React, { useState, useRef, useEffect } from "react";
import { addDays } from "../../../core/store/data";
import { ICON_VIEW_COLUMN } from "../../../core/utils/icons";
import { Icon } from "../../icon";

// eslint-disable-next-line no-magic-numbers
const NUM_DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

interface TimelineHeaderProps {
    viewDate: Date;
    isToday: boolean;
    today: Date;
    setTimelineDate: (d: Date) => void;
    filterMenu?: React.ReactNode;
    numDays?: number;
    setNumDays?: (n: number) => void;
}

export function TimelineHeader({
    viewDate,
    isToday,
    today,
    setTimelineDate,
    filterMenu,
    numDays,
    setNumDays,
}: TimelineHeaderProps) {
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (e.target instanceof Node && viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
                setShowViewMenu(false);
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);
    return (
        <header className="cal-hd">
            <div className="cal-hd-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="cal-hd-title" style={{ color: isToday ? "inherit" : "var(--accent)" }}>
                    {Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(viewDate)}
                </span>
            </div>
            <div className="cal-hd-right">
                <div className="cal-nav">
                    <button
                        className="cal-nav-btn"
                        onClick={() => setTimelineDate(addDays(viewDate, -1))}
                        aria-label="previous"
                    >
                        ◀
                    </button>
                    <button
                        className="cal-nav-btn"
                        onClick={() => setTimelineDate(today)}
                    >
                        ◉
                    </button>
                    <button
                        className="cal-nav-btn"
                        onClick={() => setTimelineDate(addDays(viewDate, 1))}
                        aria-label="next"
                    >
                        ▶
                    </button>
                </div>
                {filterMenu}
                {numDays !== undefined && setNumDays && (
                    <div style={{ position: "relative" }} ref={viewMenuRef}>
                        <button
                            onClick={() => setShowViewMenu(!showViewMenu)}
                            title="View columns"
                            style={{
                                background: showViewMenu ? "var(--bg-surface)" : "transparent",
                                border: "1px solid var(--border)",
                                color: "var(--fg)",
                                borderRadius: "4px",
                                padding: "4px 6px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                            }}
                        >
                            <Icon name={ICON_VIEW_COLUMN} size={16} />
                        </button>
                        {showViewMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    right: 0,
                                    zIndex: 1000,
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "var(--bg-surface)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--border)",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                    minWidth: "120px",
                                    overflow: "hidden"
                                }}
                            >
                                {NUM_DAYS_OPTIONS.map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => {
                                            setNumDays(n);
                                            setShowViewMenu(false);
                                        }}
                                        style={{
                                            padding: "8px 12px",
                                            textAlign: "left",
                                            background: numDays === n ? "var(--accent-soft)" : "transparent",
                                            color: numDays === n ? "var(--accent)" : "var(--fg)",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "0.9em",
                                        }}
                                    >
                                        {n} day{n !== 1 ? 's' : ''}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
