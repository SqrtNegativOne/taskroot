import type { DistractionRow, DistractionColumn, DistractionStatus } from "../../../core/store/repositories";
import type { EditingCell } from "./types";
import { formatDateTime } from "./utils";
import { StatusCell } from "./status-cell";

export interface DLogRowProps {
    row: DistractionRow;
    columns: DistractionColumn[];
    statuses: DistractionStatus[];
    editingCell?: EditingCell;
    setEditingCell: (cell?: EditingCell) => void;
    statusEditor?: string;
    setStatusEditor: (id?: string) => void;
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
                return (
                    <DLogCell
                        key={col.id}
                        col={col}
                        row={row}
                        isEditing={isEditing}
                        setEditingCell={setEditingCell}
                        {...(statusEditor !== undefined ? { statusEditor } : {})}
                        setStatusEditor={setStatusEditor}
                        updateRow={updateRow}
                        statuses={statuses}
                        addStatus={addStatus}
                    />
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

export interface DLogCellProps {
    col: DistractionColumn;
    row: DistractionRow;
    isEditing: boolean;
    setEditingCell: (cell?: EditingCell) => void;
    statusEditor?: string;
    setStatusEditor: (id?: string) => void;
    updateRow: (id: string, patch: Partial<DistractionRow>) => void;
    statuses: DistractionStatus[];
    addStatus: (label: string, color: string) => string | undefined;
}

function DLogCell({
    col,
    row,
    isEditing,
    setEditingCell,
    statusEditor,
    setStatusEditor,
    updateRow,
    statuses,
    addStatus,
}: DLogCellProps) {
    const val = typeof row[col.id] === "string" ? String(row[col.id]) : undefined;
    return (
        <button
            type="button"
            className={`dlog-cell dlog-cell-${col.type} ${isEditing ? "is-editing" : ""}`}
            style={{ width: col.width, border: "none", background: "none", font: "inherit", color: "inherit", padding: 0, textAlign: "left", cursor: "text" }}
            onClick={() => {
                if (col.type === "text")
                    setEditingCell({ rowId: row.id, colId: col.id });
                else if (col.type === "status")
                    setStatusEditor(row.id);
            }}
        >
            {col.type === "text" && (
                <DLogTextCell 
                    {...(val !== undefined ? { val } : {})}
                    isEditing={isEditing} 
                    rowId={row.id} 
                    colId={col.id} 
                    updateRow={updateRow} 
                    setEditingCell={setEditingCell} 
                />
            )}
            {col.type === "status" && (
                <StatusCell
                    {...(val !== undefined ? { value: val } : {})}
                    statuses={statuses}
                    open={statusEditor === row.id}
                    onClose={() => setStatusEditor(undefined)}
                    onChange={(v: string) => {
                        updateRow(row.id, { [col.id]: v });
                        setStatusEditor(undefined);
                    }}
                    onAdd={(label: string, color: string) => {
                        const newId = addStatus(label, color);
                        if (newId) updateRow(row.id, { [col.id]: newId });
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
}

function DLogTextCell({ 
    val, 
    isEditing, 
    rowId, 
    colId, 
    updateRow, 
    setEditingCell 
}: { 
    val?: string, 
    isEditing: boolean, 
    rowId: string, 
    colId: string, 
    updateRow: (id: string, patch: Partial<DistractionRow>) => void, 
    setEditingCell: (cell?: EditingCell) => void 
}) {
    if (isEditing) {
        return (
            <input
                ref={(r) => { if (r) r.focus(); }}
                className="dlog-cell-input"
                defaultValue={val || ""}
                onBlur={(e) => {
                    updateRow(rowId, { [colId]: e.target.value });
                    setEditingCell(undefined);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.blur();
                    }
                    if (e.key === "Escape" && e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.blur();
                        setEditingCell(undefined);
                    }
                }}
            />
        );
    }
    return val ? <>{val}</> : <span className="dim">click to edit</span>;
}
