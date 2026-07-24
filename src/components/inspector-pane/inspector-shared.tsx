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

interface TitleInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    onEnter?: () => void;
    style?: React.CSSProperties;
    className?: string;
    autoFocus?: boolean;
}

export function TitleInput({
    value,
    onChange,
    disabled,
    onEnter,
    style = {},
    className = "",
    autoFocus = false,
}: TitleInputProps) {
    const [localValue, setLocalValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
        }
    }, [autoFocus]);

    const handleBlur = () => {
        if (localValue !== value) onChange(localValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (e.target instanceof HTMLElement) e.target.blur();
            if (onEnter) onEnter();
        }
    };

    return (
        <input
            ref={inputRef}
            value={localValue || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={style}
            className={className}
            spellCheck={false}
        />
    );
}

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

export function TagsInput({ tags, allTags, onChange }: { tags: string[], allTags: string[], onChange: (tags: string[]) => void }) {
    const [inputValue, setInputValue] = React.useState("");
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
        } else if (
            e.key === "Backspace" &&
            inputValue === "" &&
            tags.length > 0
        ) {
            onChange(tags.slice(0, -1));
        }
    };

    const addTag = (tagStr: string) => {
        const t = tagStr.trim();
        if (t && !tags.includes(t)) {
            onChange([...tags, t]);
        }
        setInputValue("");
    };

    const removeTag = (t: string) => {
        onChange(tags.filter((x) => x !== t));
    };

    const suggestions = allTags.filter(
        (t) =>
            t.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(t),
    );

    return (
        <div className="tags-input-container">
            {tags.map((t: string) => (
                <span key={t} className="tag-chip">
                    {t}{" "}
                    <button type="button" onClick={() => removeTag(t)}>
                        ×
                    </button>
                </span>
            ))}
            <div style={{ position: "relative", flex: 1 }}>
                <input
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                    }
                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                />
                {showSuggestions && inputValue && suggestions.length > 0 && (
                    <div className="tags-suggestions">
                        {suggestions.map((s) => (
                            <button
                                type="button"
                                key={s}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(s);
                                }}
                                className="tag-suggestion"
                                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean, onChange: (val: boolean) => void, label: string, disabled?: boolean }) {
    return (
        <button
            type="button"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                background: "none",
                border: "none",
                color: "inherit",
                padding: 0,
                font: "inherit",
            }}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div className={`toggle-switch ${checked ? "is-on" : ""}`}>
                <div className="toggle-switch-thumb" />
            </div>
            <span style={{ fontSize: "0.9em" }}>{label}</span>
        </button>
    );
}

export function DescriptionInput({ value, onChange }: { value: string | undefined | null, onChange: (val: string) => void }) {
    const [editing, setEditing] = React.useState(false);
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    if (!editing) {
        return (
            <button
                type="button"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditing(true);
                    }
                }}
                onClick={() => setEditing(true)}
                style={{
                    minHeight: "24px",
                    cursor: "text",
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
