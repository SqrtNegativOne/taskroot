import React from "react";
import {
    MONTHS,
    PAD2,
} from "../../core/store/data";
import { useDistractions, useDistractionStatuses, useDistractionColumns } from "../../core/store/hooks";

import type { DistractionRow, DistractionStatus, DistractionColumn } from "../../core/store/repositories";

export interface EditingCell {
    rowId: string;
    colId: string;
}

// Distraction log — Notion-like table.
// Resizable columns, inline cell editing, custom status types.

export function DistractionLog() {
    const [rows, setRows] = useDistractions();
    const [statuses, setStatuses] = useDistractionStatuses();
    const [columns, setColumns] = useDistractionColumns();
    const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);
    const [statusEditor, setStatusEditor] = React.useState<string | null>(null); // rowId

    const totalWidth = columns.reduce((sum: number, c: DistractionColumn) => sum + c.width, 0) + 40; // +40 for trailing action col

    const updateRow = (id: string, patch: Partial<DistractionRow>) => {
        setRows((rs: DistractionRow[]) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };
    const deleteRow = (id: string) => {
        setRows((rs: DistractionRow[]) => rs.filter((r) => r.id !== id));
    };
    const addRow = () => {
        const now = new Date();
        const created = `${now.getFullYear()}-${PAD2(now.getMonth() + 1)}-${PAD2(now.getDate())}T${PAD2(now.getHours())}:${PAD2(now.getMinutes())}`;
        const id = `d${Date.now()}`;
        setRows((rs: DistractionRow[]) => [
            ...rs,
            { id, name: "", status: statuses[0]?.id || "", created },
        ]);
        setEditingCell({ rowId: id, colId: "name" });
    };
    const resizeCol = (colId: string, startWidth: number, startX: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
        e.preventDefault();
        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const newW = Math.max(80, startWidth + dx);
            setColumns((cs: DistractionColumn[]) =>
                cs.map((c) => (c.id === colId ? { ...c, width: newW } : c)),
            );
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const addStatus = (label: string, color: string) => {
        if (!label) return undefined;
        const id =
            label.toLowerCase().replace(/\s+/g, "-") +
            "-" +
            Date.now().toString(36).slice(-4);
        setStatuses((ss: DistractionStatus[]) => [...ss, { id, label, color }]);
        return id;
    };

    return (
        <div className="dlog">
            <div className="dlog-scroll">
                <div className="dlog-table" style={{ minWidth: totalWidth }}>
                    {/* Header row */}
                    <div className="dlog-row dlog-row-head">
                        {columns.map((col: DistractionColumn) => (
                            <div
                                key={col.id}
                                className="dlog-cell dlog-cell-head"
                                style={{ width: col.width }}
                            >
                                <span className="dlog-cell-head-icon">
                                    {colIcon(col.type)}
                                </span>
                                <span className="dlog-cell-head-label">
                                    {col.label}
                                </span>
                                <span
                                    className="dlog-col-resize"
                                    onPointerDown={(e) =>
                                        resizeCol(
                                            col.id,
                                            col.width,
                                            e.clientX,
                                        )(e)
                                    }
                                    title="Drag to resize"
                                >
                                    │
                                </span>
                            </div>
                        ))}
                        <div className="dlog-cell dlog-cell-head dlog-cell-actions">
                            <span className="dim">·</span>
                        </div>
                    </div>

                    {/* Data rows */}
                    {rows.length === 0 && (
                        <div className="dlog-row dlog-row-empty">
                            <span className="dim">
                                no distractions logged. nice.
                            </span>
                        </div>
                    )}
                    {rows.map((row: DistractionRow) => (
                        <DLogRow
                            key={String(row.id)}
                            row={row}
                            columns={columns}
                            statuses={statuses}
                            editingCell={editingCell}
                            setEditingCell={setEditingCell}
                            statusEditor={statusEditor}
                            setStatusEditor={setStatusEditor}
                            updateRow={updateRow}
                            deleteRow={deleteRow}
                            addStatus={addStatus}
                        />
                    ))}

                    {/* Add row */}
                    <button className="dlog-row dlog-row-add" onClick={addRow}>
                        <span className="dlog-add-icon">+</span>
                        <span className="dlog-add-label">add distraction</span>
                    </button>
                </div>
            </div>

            <div className="dlog-foot">
                <span className="dim">
                    {rows.length} {rows.length === 1 ? "row" : "rows"}
                </span>
                <span className="dlog-foot-sep">·</span>
                {statuses.map((s: DistractionStatus) => (
                    <span key={String(s.id)} className="dlog-foot-stat">
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
                        <span className="dim">
                            {" "}
                            {rows.filter((r: DistractionRow) => r.status === s.id).length}
                        </span>
                    </span>
                ))}
                <span className="dlog-foot-spacer" />
                <span className="dim">tip: drag column edges to resize</span>
            </div>
        </div>
    );
}

interface DLogRowProps {
    row: DistractionRow;
    columns: DistractionColumn[];
    statuses: DistractionStatus[];
    editingCell: EditingCell | null;
    setEditingCell: (cell: EditingCell | null) => void;
    statusEditor: string | null;
    setStatusEditor: (id: string | null) => void;
    updateRow: (id: string, patch: Partial<DistractionRow>) => void;
    deleteRow: (id: string) => void;
    addStatus: (label: string, color: string) => string | undefined;
}

function DLogRow({
    row,
    columns,
    statuses,
    editingCell,
    setEditingCell,
    statusEditor,
    setStatusEditor,
    updateRow,
    deleteRow,
    addStatus,
}: DLogRowProps) {
    return (
        <div className="dlog-row">
            {columns.map((col: DistractionColumn) => {
                const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.colId === col.id;
                const val = typeof row[col.id] === "string" ? (row[col.id] as string) : undefined;
                return (
                    <button
                        type="button"
                        key={col.id}
                        className={`dlog-cell dlog-cell-${col.type} ${isEditing ? "is-editing" : ""}`}
                        style={{ width: col.width, border: "none", background: "none", font: "inherit", color: "inherit", padding: 0, textAlign: "left", cursor: "text" }}
                        onClick={() => {
                            if (col.type === "text")
                                setEditingCell({
                                    rowId: row.id,
                                    colId: col.id,
                                });
                            else if (col.type === "status")
                                setStatusEditor(row.id);
                        }}
                    >
                        {col.type === "text" &&
                            (isEditing ? (
                                <input
                                    ref={(r) => { if (r && isEditing) r.focus(); }}
                                    className="dlog-cell-input"
                                    defaultValue={val || ""}
                                    onBlur={(e) => {
                                        updateRow(row.id, {
                                            [col.id]: e.target.value,
                                        });
                                        setEditingCell(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.currentTarget instanceof HTMLElement) {
                                            e.currentTarget.blur();
                                        }
                                        if (e.key === "Escape" && e.currentTarget instanceof HTMLElement) {
                                            e.currentTarget.blur();
                                            setEditingCell(null);
                                        }
                                    }}
                                />
                            ) : (
                                val || (
                                    <span className="dim">click to edit</span>
                                )
                            ))}
                        {col.type === "status" && (
                            <StatusCell
                                value={val}
                                statuses={statuses}
                                open={statusEditor === row.id}
                                onClose={() => setStatusEditor(null)}
                                onChange={(v: string) => {
                                    updateRow(row.id, { [col.id]: v });
                                    setStatusEditor(null);
                                }}
                                onAdd={(label: string, color: string) => {
                                    const newId = addStatus(label, color);
                                    if (newId)
                                        updateRow(row.id, { [col.id]: newId });
                                }}
                            />
                        )}
                        {col.type === "datetime" && (
                            <span className="dlog-datetime">
                                {formatDateTime(val)}
                            </span>
                        )}
                    </button>
                );
            })}
            <div className="dlog-cell dlog-cell-actions">
                <button
                    className="dlog-row-x"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteRow(row.id);
                    }}
                    title="Delete row"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

interface StatusCellProps {
    value?: string;
    statuses: DistractionStatus[];
    open: boolean;
    onClose: () => void;
    onChange: (v: string) => void;
    onAdd: (label: string, color: string) => void;
}

function StatusCell({
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

function colIcon(type: string) {
    return ({ text: "A", status: "◐", datetime: "◷" } as Record<string, string>)[type] || "·";
}

function formatDateTime(s?: string) {
    if (!s) return "";
    const [date, time] = s.split("T");
    if (!date) return "";
    const [, m, d] = date.split("-");
    if (!m || !d) return "";
    return `${MONTHS[parseInt(m, 10) - 1]?.toLowerCase() || ""} ${parseInt(d, 10)} · ${time || ""}`;
}

function hexAlpha(hex: string, alpha: number) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

