import type { DistractionRow, DistractionColumn, DistractionStatus } from "../../../core/store/repositories";
import type { EditingCell } from "./types";
import { formatDateTime } from "./utils";
import { StatusCell } from "./status-cell";

export interface DLogRowProps {
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

export function DLogRow({
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
