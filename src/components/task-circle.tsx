import React from "react";

export interface TaskCircleProps {
    priority?: number | string;
    isDoneOrChecking: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    style?: React.CSSProperties;
    title?: string;
    ariaLabel?: string;
}

export function TaskCircle({
    priority,
    isDoneOrChecking,
    onClick,
    style,
    title,
    ariaLabel,
}: TaskCircleProps) {
    return (
        <button
            type="button"
            className={`task-circle pri-bg-${priority}`}
            style={{ border: "none", padding: 0, font: "inherit", color: "inherit", ...style }}
            onClick={onClick}
            title={title || "Toggle Done"}
            aria-label={ariaLabel || `Priority ${priority}`}
        >
            {isDoneOrChecking && (
                <svg
                    className="task-circle-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="4 12 9 17 20 6"></polyline>
                </svg>
            )}
        </button>
    );
}
