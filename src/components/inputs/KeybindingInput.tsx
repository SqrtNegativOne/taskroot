import React, { useState } from "react";

export interface KeybindingInputProps {
    value: string | number;
    onChange: (val: string) => void;
}

export function KeybindingInput({ value, onChange }: KeybindingInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    return (
        <button
            type="button"
            style={{
                padding: "4px 8px",
                background: isRecording ? "var(--accent-soft)" : "var(--bg-app)",
                border: "1px solid " + (isRecording ? "var(--accent)" : "var(--border)"),
                borderRadius: "4px",
                fontSize: "0.9em",
                fontFamily: "monospace",
                cursor: "pointer",
                color: "var(--fg)",
                display: "inline-block",
            }}
            onClick={(e) => {
                e.preventDefault();
                setIsRecording(true);
                const handler = (evt: KeyboardEvent) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (evt.key === "Escape") {
                        setIsRecording(false);
                        window.removeEventListener("keydown", handler);
                        return;
                    }
                    const parts = [];
                    if (evt.ctrlKey) parts.push("Ctrl");
                    if (evt.metaKey) parts.push("Meta");
                    if (evt.altKey) parts.push("Alt");
                    if (evt.shiftKey) parts.push("Shift");
                    if (!["Control", "Meta", "Alt", "Shift"].includes(evt.key)) {
                        parts.push(
                            evt.key === " " ? "Space" : evt.key.length === 1 ? evt.key.toUpperCase() : evt.key
                        );
                        onChange(parts.join("+"));
                        setIsRecording(false);
                        window.removeEventListener("keydown", handler);
                    }
                };
                window.addEventListener("keydown", handler);
            }}
        >
            {isRecording ? "Press any key..." : value}
        </button>
    );
}
