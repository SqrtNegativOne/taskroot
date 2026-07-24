import React, { useState, useEffect, useRef } from "react";

export interface SelectInputProps {
    value: string;
    onChange: (val: string) => void;
    options: { label: string; value: string }[];
    style?: React.CSSProperties;
}

export function SelectInput({ value, onChange, options, style }: SelectInputProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o) => o.value === value);

    return (
        <div ref={ref} style={{ position: "relative", ...style }}>
            <button
                type="button"
                className="selector-input"
                style={{
                    padding: "4px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    background: "var(--bg-app)",
                    color: "var(--fg)",
                    cursor: "pointer",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                }}
                onClick={() => setOpen(!open)}
            >
                {selectedOption ? selectedOption.label : value}
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px", marginLeft: "auto", opacity: 0.5 }}
                >
                    arrow_drop_down
                </span>
            </button>
            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1001,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        marginTop: "4px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                >
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(o.value);
                                setOpen(false);
                            }}
                            style={{
                                padding: "6px 8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                background:
                                    value === o.value
                                        ? "var(--accent-soft)"
                                        : "transparent",
                                width: "100%",
                                border: "none",
                                textAlign: "left",
                                color: "inherit",
                                fontFamily: "inherit",
                                fontSize: "inherit",
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
