import React from "react";

export interface SegmentedControlProps<T> {
    options: { label: string; value: T }[];
    value: T;
    onChange: (val: T) => void;
}

export function SegmentedControl<T>({
    options,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [thumbStyle, setThumbStyle] = React.useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        opacity: 0,
        init: false,
    });

    React.useLayoutEffect(() => {
        const updateThumb = () => {
            if (!containerRef.current) return;
            const activeBtn = containerRef.current.querySelector(
                'button[data-active="true"]',
            );
            if (activeBtn instanceof HTMLButtonElement) {
                setThumbStyle({
                    left: activeBtn.offsetLeft,
                    top: activeBtn.offsetTop,
                    width: activeBtn.offsetWidth,
                    height: activeBtn.offsetHeight,
                    opacity: 1,
                    init: true,
                });
            } else {
                setThumbStyle((prev) => ({ ...prev, opacity: 0, init: true }));
            }
        };

        updateThumb();

        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
            const ro = new ResizeObserver(updateThumb);
            ro.observe(containerRef.current);
            return () => ro.disconnect();
        }
    }, [value, options]);

    return (
        <div
            ref={containerRef}
            style={{
                display: "inline-flex",
                position: "relative",
                background: "var(--bg-app)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                userSelect: "none",
                flexWrap: "wrap",
                gap: "2px",
                zIndex: 0,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    background: "var(--bg-surface)",
                    borderRadius: "5px",
                    boxShadow:
                        "0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)",
                    transition: thumbStyle.init
                        ? "all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)"
                        : "none",
                    left: thumbStyle.left,
                    top: thumbStyle.top,
                    width: thumbStyle.width,
                    height: thumbStyle.height,
                    opacity: thumbStyle.opacity,
                    zIndex: -1,
                }}
            />
            {options.map((opt) => (
                <button
                    type="button"
                    key={String(opt.value)}
                    data-active={opt.value === value}
                    onClick={() => onChange(opt.value)}
                    data-cuelume-toggle
                    style={{
                        appearance: "none",
                        background: "transparent",
                        border: "none",
                        borderRadius: "5px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        cursor: "pointer",
                        color:
                            opt.value === value ? "var(--fg)" : "var(--fg-dim)",
                        fontWeight: opt.value === value ? 500 : 400,
                        transition:
                            "color 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)",
                        flex: "1 1 auto",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
