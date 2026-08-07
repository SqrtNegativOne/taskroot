import React from "react";
import type { DistractionStatus } from "../../../core/store/repositories";
import { hexAlpha } from "./utils";

const OPACITY_SELECTED_BG = 0.22;
const OPACITY_BG = 0.18;
const OPACITY_BORDER = 0.6;



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
        if (!open) return undefined;
        const onDoc = (e: PointerEvent) => {
            if (popRef.current && !(e.target instanceof Node && popRef.current.contains(e.target))) onClose();
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
                              background: hexAlpha(current.color, OPACITY_BG),
                              color: current.color,
                              borderColor: hexAlpha(current.color, OPACITY_BORDER),
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
                    role="presentation"
                    onPointerDown={(e) => e.stopPropagation()}
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
                                    background: hexAlpha(s.color, OPACITY_BG),
                                    color: s.color,
                                    borderColor: hexAlpha(s.color, OPACITY_BORDER),
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
                                            background: hexAlpha(c, OPACITY_SELECTED_BG),
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
