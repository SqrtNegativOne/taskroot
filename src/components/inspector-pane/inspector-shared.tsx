import { MINUTES_IN_HOUR } from "../../core/utils/constants";
import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";

const OPACITY_DISABLED = 0.3;


export const TaskStatusSelect = ({ value, onChange }: { value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select value={value} onChange={onChange}>
        <option value="todo">todo</option>
        <option value="next-up">next up</option>
        <option value="doing">doing</option>
        <option value="done">done</option>
    </select>
);

export const RepeatSelect = ({ value, disabled, onChange }: { value: string, disabled: boolean, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select value={value} disabled={disabled} onChange={onChange}>
        <option value="">None</option>
        <option value="FREQ=DAILY">Daily</option>
        <option value="FREQ=WEEKLY">Weekly</option>
        <option value="FREQ=MONTHLY">Monthly</option>
        <option value="FREQ=YEARLY">Yearly</option>
    </select>
);







export function InspectorPaneHeader({ handleClose, handleDelete, isReadOnlyCalendar }: { handleClose: () => void, handleDelete: () => void, isReadOnlyCalendar: boolean }) {
    return (
        <div
            className="inspector-hd"
            style={{
                padding: "0 8px",
                borderBottom: "none",
                background: "transparent",
            }}
        >
            <button
                className="inspector-icon-btn"
                onClick={handleClose}
                title="Close Pane"
            >
                <span className="material-symbols-outlined">
                    keyboard_double_arrow_right
                </span>
            </button>
            <button
                className="inspector-icon-btn"
                onClick={handleDelete}
                title="Delete"
                disabled={isReadOnlyCalendar}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", opacity: isReadOnlyCalendar ? OPACITY_DISABLED : 1 }}
                >
                    delete
                </span>
            </button>
        </div>
    );
}

export function LabeledToggle({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    return (
        <button type="button" className="inspector-toggle-label" disabled={disabled} onClick={() => onChange(!checked)}>
            <div className={`toggle-switch ${checked ? "is-on" : ""}`}>
                <div className="toggle-switch-thumb" />
            </div>
            <span className="inspector-toggle-text">{label}</span>
        </button>
    );
}

