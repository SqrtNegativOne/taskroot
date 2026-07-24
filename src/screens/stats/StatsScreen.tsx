import { TitleBar } from "../../components/shell";

export function StatsScreen() {
    return (
        <div className="app">
            <TitleBar current="stats"  />
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
