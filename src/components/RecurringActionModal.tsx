

export type RecurringMode = "instance" | "following" | "all";

interface RecurringActionModalProps {
    isOpen: boolean;
    actionType: "edit" | "delete";
    onConfirm: (mode: RecurringMode) => void;
    onCancel: () => void;
}

export function RecurringActionModal({ isOpen, actionType, onConfirm, onCancel }: RecurringActionModalProps) {
    if (!isOpen) return <></>;

    const actionText = actionType === "edit" ? "Edit" : "Delete";

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
        }}>
            <div style={{
                background: "var(--bg-panel, #1e1e1e)",
                padding: "24px",
                borderRadius: "8px",
                width: "320px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                color: "var(--fg-primary, #fff)"
            }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600 }}>{actionText} recurring event</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                        <input type="radio" name="recurring_mode" value="instance" defaultChecked id="mode_instance" />
                        This event
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                        <input type="radio" name="recurring_mode" value="following" id="mode_following" />
                        This and following events
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                        <input type="radio" name="recurring_mode" value="all" id="mode_all" />
                        All events
                    </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button 
                        onClick={onCancel}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--fg-secondary, #aaa)",
                            cursor: "pointer",
                            padding: "6px 12px",
                            fontSize: "14px"
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            const selected = document.querySelector('input[name="recurring_mode"]:checked');
                            if (selected && selected instanceof HTMLInputElement) {
                                const mode = selected.value;
                                if (mode === "instance" || mode === "following" || mode === "all") {
                                    onConfirm(mode);
                                }
                            }
                        }}
                        style={{
                            background: "var(--accent, #3b82f6)",
                            border: "none",
                            color: "#fff",
                            cursor: "pointer",
                            padding: "6px 16px",
                            borderRadius: "4px",
                            fontWeight: 500,
                            fontSize: "14px"
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
