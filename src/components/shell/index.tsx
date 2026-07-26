import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../icon";
import { WindowControls } from "./window-controls";
import { SyncStatus } from "./sync-status";
import { StageIndicator } from "./stage-indicator";
import { MoreScreensDropdown } from "./more-screens-dropdown";
import "./shell.css";

export function LoginTitleBar() {
    return (
        <header className="topbar">
            <div className="drag-region" />
            <WindowControls />
        </header>
    );
}

export function TitleBar({ current }: { current: string }) {
    return (
        <header className="topbar">
            <div className="drag-region" />
            <div className="topbar-left">
                <Link
                    to="/settings"
                    className={`stage ${current === "settings" ? "is-current" : ""}`}
                    style={{ padding: "0 4px", display: "flex" }}
                    aria-label="Settings"
                    data-cuelume-hover="tick"
                    data-cuelume-toggle
                >
                    <Icon name="settings" size={18} />
                </Link>
                <StageIndicator current={current} />
                <MoreScreensDropdown />
            </div>
            <div className="topbar-right"></div>
            <SyncStatus />
        </header>
    );
}
