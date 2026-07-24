import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    Fragment,
} from "react";
import {
    DEFAULT_STATUSES,
    DEFAULT_DISTRACTION_COLUMNS,
    SAMPLE_DISTRACTIONS,
    MONTHS,
    PAD2,
} from "../../core/store/data";
import { useStored } from "../../core/store/store";

// Distraction log — Notion-like table.
// Resizable columns, inline cell editing, custom status types.

export function DistractionLog() {
    const [rows, setRows] = useStored("distractions", SAMPLE_DISTRACTIONS);
    const [statuses, setStatuses] = useStored(
        "distractionStatuses",
        DEFAULT_STATUSES,
    );
    const [columns, setColumns] = useStored(
        "distractionColumns",
        DEFAULT_DISTRACTION_COLUMNS,
    );
    const [editingCell, setEditingCell] = React.useState(null); // { rowId, colId }
    const [statusEditor, setStatusEditor] = React.useState(null); // rowId | '__new_type__'

    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) + 40; // +40 for trailing action col

    const updateRow = (id, patch) => {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };
    const deleteRow = (id) => {
        setRows((rs) => rs.filter((r) => r.id !== id));
    };
    const addRow = () => {
        const now = new Date();
        const created = `${now.getFullYear()}-${PAD2(now.getMonth() + 1)}-${PAD2(now.getDate())}T${PAD2(now.getHours())}:${PAD2(now.getMinutes())}`;
        const id = `d${Date.now()}`;
        setRows((rs) => [
            ...rs,
            { id, name: "", status: statuses[0]?.id || "", created },
        ]);
        setEditingCell({ rowId: id, colId: "name" });
    };
    const resizeCol = (colId, startWidth, startX) => (e) => {
        e.preventDefault();
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const newW = Math.max(80, startWidth + dx);
            setColumns((cs) =>
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

    const addStatus = (label, color) => {
        if (!label) return;
        const id =
            label.toLowerCase().replace(/\s+/g, "-") +
            "-" +
            Date.now().toString(36).slice(-4);
        setStatuses((ss) => [...ss, { id, label, color }]);
        return id;
    };

    return (
        <div className="dlog">
            <div className="dlog-scroll">
                <div className="dlog-table" style={{ minWidth: totalWidth }}>
                    {/* Header row */}
                    <div className="dlog-row dlog-row-head">
                        {columns.map((col) => (
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
                    {rows.map((row) => (
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
                {statuses.map((s) => (
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
                            {rows.filter((r) => r.status === s.id).length}
                        </span>
                    </span>
                ))}
                <span className="dlog-foot-spacer" />
                <span className="dim">tip: drag column edges to resize</span>
            </div>
        </div>
    );
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
}) {
    return (
        <div className="dlog-row">
            {columns.map((col) => {
                const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.colId === col.id;
                return (
                    <div
                        key={col.id}
                        className={`dlog-cell dlog-cell-${col.type} ${isEditing ? "is-editing" : ""}`}
                        style={{ width: col.width }}
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
                                    autoFocus
                                    className="dlog-cell-input"
                                    defaultValue={row[col.id] || ""}
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
                                row[col.id] || (
                                    <span className="dim">click to edit</span>
                                )
                            ))}
                        {col.type === "status" && (
                            <StatusCell
                                value={row[col.id]}
                                statuses={statuses}
                                open={statusEditor === row.id}
                                onOpen={() => setStatusEditor(row.id)}
                                onClose={() => setStatusEditor(null)}
                                onChange={(v) => {
                                    updateRow(row.id, { [col.id]: v });
                                    setStatusEditor(null);
                                }}
                                onAdd={(label, color) => {
                                    const newId = addStatus(label, color);
                                    if (newId)
                                        updateRow(row.id, { [col.id]: newId });
                                }}
                            />
                        )}
                        {col.type === "datetime" && (
                            <span className="dlog-datetime">
                                {formatDateTime(row[col.id])}
                            </span>
                        )}
                    </div>
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

function StatusCell({
    value,
    statuses,
    open,
    onOpen,
    onClose,
    onChange,
    onAdd,
}) {
    const current = statuses.find((s) => s.id === value);
    const popRef = React.useRef(null);
    const [addingStatus, setAddingStatus] = React.useState(false);
    const [newLabel, setNewLabel] = React.useState("");
    const [newColor, setNewColor] = React.useState("var(--tag-purple)");

    React.useEffect(() => {
        if (!open) return;
        const onDoc = (e) => {
            if (popRef.current && !popRef.current.contains(e.target)) onClose();
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
                    onClick={(e) => e.stopPropagation()}
                >
                    {statuses.map((s) => (
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
                                autoFocus
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

function colIcon(type) {
    return { text: "A", status: "◐", datetime: "◷" }[type] || "·";
}

function formatDateTime(s) {
    if (!s) return "";
    const [date, time] = s.split("T");
    const [y, m, d] = date.split("-");
    return `${MONTHS[parseInt(m, 10) - 1].toLowerCase()} ${parseInt(d, 10)} · ${time || ""}`;
}

export function hexAlpha(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

