import React from "react";

const handleMinimize = () => window.electronAPI?.minimizeWindow?.();
const handleMaximize = () => window.electronAPI?.maximizeWindow?.();
const handleClose = () => window.electronAPI?.closeWindow?.();

export function WindowControls({ children }: { children?: React.ReactNode }) {
    return (
        <div className="window-controls">
            {children}
            <button
                className="win-btn minimize"
                onClick={handleMinimize}
                title="Minimize"
                aria-label="Minimize"
                data-cuelume-hover="tick"
                data-cuelume-toggle
            >
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                        d="M 1,5 h 8"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            </button>
            <button
                className="win-btn maximize"
                onClick={handleMaximize}
                title="Maximize"
                aria-label="Maximize"
                data-cuelume-hover="tick"
                data-cuelume-toggle
            >
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <rect
                        x="1.5"
                        y="1.5"
                        width="7"
                        height="7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            </button>
            <button
                className="win-btn close"
                onClick={handleClose}
                title="Close"
                aria-label="Close"
                data-cuelume-hover="tick"
                data-cuelume-toggle
            >
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                        d="M 1.5,1.5 l 7,7 M 8.5,1.5 l -7,7"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            </button>
        </div>
    );
}
