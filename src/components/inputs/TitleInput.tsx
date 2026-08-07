/* oxlint-disable react(no-array-index-key) */
import React from "react";
import { parseSigils, type ParsedProperties } from "../../core/utils/sigil-parser";

export interface TitleInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    onEnter?: () => void;
    style?: React.CSSProperties;
    className?: string;
    autoFocus?: boolean;
    parseMode?: boolean; // Set to true to enable sigil highlighting and stripping
    onPropertiesParsed?: (properties: ParsedProperties) => void;
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
    parseMode = false,
    onPropertiesParsed,
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
        let finalValue = localValue;
        if (parseMode) {
            const { cleanTitle, properties } = parseSigils(localValue || "");
            finalValue = cleanTitle;
            if (onPropertiesParsed) onPropertiesParsed(properties);
            setLocalValue(cleanTitle);
        }
        if (finalValue !== value) onChange(finalValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.target instanceof HTMLElement) e.target.blur();
            if (onEnter) onEnter();
        }
    };

    const tokens = parseMode ? parseSigils(localValue || "").tokens : [];

    return (
        <div style={{ position: "relative", width: style.width || "100%", display: "block" }}>
            {parseMode && (
                <div
                    className={className}
                    style={{
                        ...style,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        color: "transparent",
                        pointerEvents: "none",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        border: "none",
                        background: "transparent",
                        wordBreak: "break-word",
                    }}
                >
                    {tokens.map((t) => (
                            <span
                                key={crypto.randomUUID()}
                                style={
                                    t.type === "sigil"
                                        ? { backgroundColor: "rgba(255, 75, 75, 0.4)", borderRadius: "3px" }
                                        : {}
                                }
                            >
                                {t.text}
                            </span>
                    ))}
                </div>
            )}
            <textarea
                ref={inputRef}
                value={localValue || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                style={{
                    ...style,
                    resize: "none",
                    overflow: "hidden",
                    display: "block",
                    width: "100%",
                    background: parseMode ? "transparent" : style.background,
                }}
                className={className}
                spellCheck={false}
                rows={1}
            />
        </div>
    );
}
