import React from "react";
import { TitleBar } from "../../components/shell";
import { TODAY } from "../../core/store/data";

export function StatsScreen() {
    return (
        <div className="app">
            <TitleBar current="stats" today={TODAY} />
            <div
                className="main"
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <h2 style={{ color: "var(--fg)" }}>Stats Screen Placeholder</h2>
            </div>
        </div>
    );
}
