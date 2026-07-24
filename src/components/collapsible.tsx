import React from "react";

// Collapsible toggle primitive — TUI-style with chevron.

export interface CollapsibleProps {
    title: React.ReactNode;
    badge?: React.ReactNode;
    defaultOpen?: boolean;
    children?: React.ReactNode;
}

export function Collapsible({ title, badge, defaultOpen = false, children }: CollapsibleProps) {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
        <section className={`collapsible ${open ? "is-open" : ""}`}>
            <button
                className="collapsible-head"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span className="collapsible-chev">{open ? "▾" : "▸"}</span>
                <span className="collapsible-title">{title}</span>
                {badge != null && (
                    <span className="collapsible-badge">{badge}</span>
                )}
                <span className="collapsible-rule" />
                <span className="collapsible-hint">
                    {open ? "collapse" : "expand"}
                </span>
            </button>
            {open && <div className="collapsible-body">{children}</div>}
        </section>
    );
}
