import React from "react";

export interface DescriptionInputProps {
    value: string | undefined | null;
    onChange: (val: string) => void;
    disabled?: boolean;
}

export function DescriptionInput({ value, onChange, disabled }: DescriptionInputProps) {
    const [editing, setEditing] = React.useState(false);
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    if (!editing) {
        return (
            <button
                type="button"
                disabled={disabled}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditing(true);
                    }
                }}
                onClick={() => {
                    if (!disabled) setEditing(true);
                }}
                style={{
                    minHeight: "24px",
                    cursor: disabled ? "not-allowed" : "text",
                    padding: "0",
                    color: value ? "var(--fg)" : "var(--fg-dim)",
                    borderRadius: "4px",
                    background: "none",
                    border: "none",
                    font: "inherit",
                    textAlign: "left",
                    width: "100%",
                }}
            >
                {value || "Add description..."}
            </button>
        );
    }

    return (
        <textarea
            ref={(el) => { if (el && editing) el.focus(); }}
            value={localValue || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
            onBlur={() => {
                setEditing(false);
                if (localValue !== value) onChange(localValue || "");
            }}
            rows={5}
            style={{
                width: "100%",
                resize: "vertical",
                padding: "4px",
                fontFamily: "inherit",
                border: "1px solid var(--border)",
                background: "var(--bg-input, var(--bg-surface))",
                color: "var(--fg)",
                borderRadius: "4px",
            }}
            placeholder="Add a description..."
            spellCheck={false}
        />
    );
}
