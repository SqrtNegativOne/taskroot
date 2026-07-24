

export interface NumberInputProps {
    value: number | string;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
}

export function NumberInput({ value, onChange, min, max }: NumberInputProps) {
    return (
        <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            style={{
                background: "var(--bg-input)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "4px 8px",
                width: "80px",
            }}
        />
    );
}
