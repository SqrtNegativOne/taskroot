export interface TimeInputProps {
    value: string;
    onChange: (val: string) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
    return (
        <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                background: "var(--bg-input)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "4px 8px",
            }}
        />
    );
}
