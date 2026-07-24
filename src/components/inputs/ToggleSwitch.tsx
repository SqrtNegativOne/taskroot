export interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel?: string;
}

export function ToggleSwitch({ checked, onChange, ariaLabel = "Toggle" }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            aria-label={ariaLabel}
            style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                color: "var(--fg)",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
            }}
            onClick={() => onChange(!checked)}
            data-cuelume-toggle
        >
            <div className={`toggle-switch ${checked ? "is-on" : ""}`}>
                <div className="toggle-switch-thumb" />
            </div>
        </button>
    );
}
