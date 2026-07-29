import React from "react";
import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../components/icon";




export function CalendarHeader({
    titleLabel,
    today,
    view,
    setView,
    setAnchor,
    shift,
    filterMenu
}: {
    titleLabel: string;
    today: Date | number | string;
    view: string;
    setView: (view: string) => void;
    setAnchor: (date: Date) => void;
    shift: (n: number) => void;
    filterMenu: React.ReactNode;
}) {
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [closingViewMenu, setClosingViewMenu] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement>(null);

    const closeViewMenu = () => {
        setClosingViewMenu(true);
        setTimeout(() => {
            setShowViewMenu(false);
            setClosingViewMenu(false);
        }, ANIMATION_DELAY_MS);
    };

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (
                e.target instanceof Node &&
                viewMenuRef.current &&
                !viewMenuRef.current.contains(e.target)
            ) {
                if (showViewMenu && !closingViewMenu) closeViewMenu();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [showViewMenu, closingViewMenu]);

    return (
        <header className="cal-hd">
            <div className="cal-hd-left">
                <span className="cal-hd-title">{titleLabel}</span>
            </div>
            <div className="cal-hd-right">
                <div className="cal-nav">
                    <button
                        className="cal-nav-btn"
                        onClick={() => shift(-1)}
                        aria-label="previous"
                    >
                        ◀
                    </button>
                    <button
                        className="cal-nav-btn"
                        onClick={() => setAnchor(new Date(today))}
                    >
                        ◉
                    </button>
                    <button
                        className="cal-nav-btn"
                        onClick={() => shift(1)}
                        aria-label="next"
                    >
                        ▶
                    </button>
                </div>
                {filterMenu}
                <div style={{ position: "relative" }} ref={viewMenuRef}>
                    <button
                        onClick={() => {
                            if (showViewMenu) closeViewMenu();
                            else setShowViewMenu(true);
                        }}
                        title="View options"
                        style={{
                            background: showViewMenu
                                ? "var(--bg-surface)"
                                : "transparent",
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
                        <Icon name="dashboard" size={16} />
                    </button>
                    
                    {showViewMenu && (
                        <div
                            className={`floating-menu ${closingViewMenu ? "is-closing" : ""}`}
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
                            {["month", "1 week", "3 weeks"].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setView(mode);
                                        closeViewMenu();
                                    }}
                                    style={{
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        background: view === mode || (view === "week" && mode === "1 week") ? "var(--accent-soft)" : "transparent",
                                        color: view === mode || (view === "week" && mode === "1 week") ? "var(--accent)" : "var(--fg)",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "0.9em",
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
