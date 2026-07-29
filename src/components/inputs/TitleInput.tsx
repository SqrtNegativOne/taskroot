import React from "react";

export interface TitleInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    onEnter?: () => void;
    style?: React.CSSProperties;
    className?: string;
    autoFocus?: boolean;
}

const defaultStyle: React.CSSProperties = {};

export function TitleInput({
    value,
    onChange,
    disabled,
    onEnter,
    style = defaultStyle,
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
