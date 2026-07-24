import React from "react";
import type { DistractionStatus } from "../../../core/store/repositories";
import { hexAlpha } from "./utils";

export interface StatusCellProps {
    value?: string;
    statuses: DistractionStatus[];
    open: boolean;
    onClose: () => void;
    onChange: (v: string) => void;
    onAdd: (label: string, color: string) => void;
}

export function StatusCell({
    value,
    statuses,
    open,
    onClose,
    onChange,
    onAdd,
}: StatusCellProps) {
    const current = statuses.find((s) => s.id === value);
    const popRef = React.useRef<HTMLDivElement>(null);
    const [addingStatus, setAddingStatus] = React.useState(false);
    const [newLabel, setNewLabel] = React.useState("");
    const [newColor, setNewColor] = React.useState("var(--tag-purple)");

    React.useEffect(() => {
        if (!open) return;
        const onDoc = (e: PointerEvent) => {
            if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
        };
        setTimeout(() => document.addEventListener("pointerdown", onDoc), 0);
        return () => document.removeEventListener("pointerdown", onDoc);
    }, [open, onClose]);

    return (
        <>
            <span
                className="status-chip"
                style={
                    current
                        ? {
                              background: hexAlpha(current.color, 0.18),
                              color: current.color,
                              borderColor: hexAlpha(current.color, 0.6),
                          }
                        : { color: "var(--fg-dim)" }
                }
            >
                {current ? current.label : <span className="dim">select…</span>}
            </span>
            {open && (
                <div
                    className="dlog-status-pop"
                    ref={popRef}
                    onPointerDown={(e) => e.stopPropagation()} // eslint-disable-line jsx-a11y/no-static-element-interactions
                >
                    {statuses.map((s: DistractionStatus) => (
                        <button
                            key={s.id}
                            className="dlog-status-opt"
                            onClick={() => onChange(s.id)}
                        >
                            <span
                                className="status-chip"
                                style={{
                                    background: hexAlpha(s.color, 0.18),
                                    color: s.color,
                                    borderColor: hexAlpha(s.color, 0.6),
                                }}
                            >
                                {s.label}
                            </span>
                        </button>
                    ))}
                    <div className="dlog-status-sep">─ ─ ─ ─ ─ ─ ─ ─ ─</div>
                    {addingStatus ? (
                        <div className="dlog-status-new">
                            <input
                                ref={(r) => { if (r && addingStatus) r.focus(); }}
                                className="dlog-status-new-input"
                                placeholder="status name…"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onAdd(newLabel.trim(), newColor);
                                        setNewLabel("");
                                        setAddingStatus(false);
                                    } else if (e.key === "Escape") {
                                        setAddingStatus(false);
                                        setNewLabel("");
                                    }
                                }}
                            />
                            <div className="dlog-status-colors">
                                {[
                                    "var(--tag-red)",
                                    "var(--tag-yellow)",
                                    "var(--tag-green)",
                                    "var(--tag-purple)",
                                    "var(--tag-gold)",
                                    "#9bb0d4",
                                ].map((c) => (
                                    <button
                                        key={c}
                                        className={`dlog-status-color ${newColor === c ? "is-selected" : ""}`}
                                        style={{
                                            background: hexAlpha(c, 0.22),
                                            borderColor: c,
                                            color: c,
                                        }}
                                        onClick={() => setNewColor(c)}
                                    >
                                        ●
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            className="dlog-status-opt dlog-status-add"
                            onClick={() => setAddingStatus(true)}
                        >
                            <span className="bracket">+</span> add status type
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
