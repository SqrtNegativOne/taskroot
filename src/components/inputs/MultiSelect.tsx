import { useState, useEffect, useRef } from "react";

export function MultiSelect({ options, values, onChange }: { options: string[], values: string[], onChange: (v: string[]) => void }) {
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

    const toggle = (opt: string) => {
        if (values.includes(opt)) {
            onChange(values.filter(v => v !== opt));
        } else {
            onChange([...values, opt]);
        }
    };

    return (
        <div ref={ref} style={{ position: "relative", flex: 1.5 }}>
            <button
                type="button"
                className="selector-input" 
                style={{
                    padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-app)", color: "var(--fg)", cursor: "pointer", minHeight: "24px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px",
                    width: "100%", textAlign: "left", fontFamily: "inherit", fontSize: "inherit"
                }}
                onClick={() => setOpen(!open)}
            >
                {values.length === 0 ? <span style={{opacity: 0.5}}>None</span> : values.join(", ")}
            </button>
            {open && (
                <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1001, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px", maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", marginTop: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}>
                    {options.map(o => (
                        <button 
                            key={o} 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggle(o); }} 
                            style={{
                                padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                                background: values.includes(o) ? "var(--accent-soft)" : "transparent",
                                width: "100%", border: "none", textAlign: "left", color: "inherit", fontFamily: "inherit", fontSize: "inherit"
                            }}
                        >
                            <input type="checkbox" checked={values.includes(o)} readOnly style={{margin: 0}} />
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
