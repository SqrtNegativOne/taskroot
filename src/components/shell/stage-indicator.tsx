import React from "react";
import { Link } from "react-router-dom";

export function StageIndicator({ current }: { current: string }) {
    const stages = [
        { key: "plan", label: "plan", href: "/plan" },
        { key: "do", label: "do", href: "/do" },
    ];
    const isDefault = ["plan", "do", "settings"].includes(current);

    return (
        <nav className="stages" aria-label="Stages">
            {stages.map((s, i) => (
                <React.Fragment key={s.key}>
                    <Link
                        to={s.href}
                        className={`stage ${current === s.key ? "is-current" : ""}`}
                        aria-current={current === s.key ? "page" : undefined}
                        data-cuelume-hover="tick"
                        data-cuelume-toggle
                    >
                        <span className="stage-name">{s.label}</span>
                    </Link>
                    {(i < stages.length - 1 || !isDefault) && (
                        <span className="stage-sep">|</span>
                    )}
                </React.Fragment>
            ))}
            {!isDefault && current && (
                <div className="stage is-current" style={{ display: "flex" }}>
                    <span className="stage-name">{current}</span>
                </div>
            )}
        </nav>
    );
}
