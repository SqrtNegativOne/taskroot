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
    const inputRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
            // trigger auto-resize on mount
            inputRef.current.style.height = "0px";
            inputRef.current.style.height = inputRef.current.scrollHeight + "px";
        }
    }, [autoFocus]);

    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "0px";
            inputRef.current.style.height = inputRef.current.scrollHeight + "px";
        }
    }, [localValue]);

    const handleBlur = () => {
        if (localValue !== value) onChange(localValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.target instanceof HTMLElement) e.target.blur();
            if (onEnter) onEnter();
        }
    };

    return (
        <textarea
            ref={inputRef}
            value={localValue || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={{ ...style, resize: "none", overflow: "hidden", display: "block" }}
            className={className}
            spellCheck={false}
            rows={1}
        />
    );
}
