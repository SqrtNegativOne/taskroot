import React from "react";
import { PAD2 } from "../../../core/store/data";
import { useDistractions, useDistractionStatuses, useDistractionColumns } from "../../../core/store/hooks";
import type { DistractionRow, DistractionStatus, DistractionColumn } from "../../../core/store/repositories";
import { DLogRow } from "./row";
import type { EditingCell } from "./types";
import { colIcon, hexAlpha } from "./utils";

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
