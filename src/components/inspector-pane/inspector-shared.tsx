import React from "react";

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

export function minToTime(m: number): string {
    if (typeof m !== "number" || isNaN(m)) return "";
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function timeToMin(t: string): number {
    if (!t) return 0;
    const [hh, mm] = t.split(":");
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}
