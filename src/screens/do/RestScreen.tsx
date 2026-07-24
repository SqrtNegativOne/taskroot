import React from "react";
import {
    TODAY,
    MONTHS,
    DOW_SHORT,
} from "../../core/store/data";
import { useRestItems } from "../../core/store/hooks";


// Rest screen — large checklist, editable, resets on each visit.

export function RestScreen() {


    // Reset every visit: don't persist checks across reloads, but keep custom items.
    const [items, setItems] = useRestItems();
    // Local check state — not persisted, resets every page load
    const [checked, setChecked] = React.useState<Record<string, boolean>>({});
    const [editing, setEditing] = React.useState<string | null>(null);
    const [adding, setAdding] = React.useState(false);
    const [draft, setDraft] = React.useState("");

    const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
    const updateItem = (id: string, title: string) => {
        if (!title.trim()) {
            setItems((its) => its.filter((i) => i.id !== id));
        } else {
            setItems((its) =>
                its.map((i) =>
                    i.id === id ? { ...i, title: title.trim() } : i,
                ),
            );
        }
        setEditing(null);
    };
    const addItem = () => {
        const t = draft.trim();
        if (!t) {
            setAdding(false);
            setDraft("");
            return;
        }
        setItems((its) => [
            ...its,
            { id: `r${Date.now()}`, title: t, type: "check" },
        ]);
        setDraft("");
        setAdding(false);
    };
    const removeItem = (id: string) =>
        setItems((its) => its.filter((i) => i.id !== id));

    const allChecked = items.length > 0 && items.every((i) => checked[i.id]);

    return (
        <div
            className="rest-main"
            style={{ padding: "24px", minHeight: "auto" }}
        >
            <div className="rest-stage" style={{ margin: "0 auto" }}>
                <header className="rest-header">
                    <div className="rest-bracket-row">
                        <span className="bracket">┌─</span>
                        <span className="rest-label">
                            REST · {DOW_SHORT[TODAY.getDay()].toLowerCase()}{" "}
                            {MONTHS[TODAY.getMonth()].toLowerCase()}{" "}
                            {TODAY.getDate()}
                        </span>
                        <span className="bracket">─┐</span>
                    </div>
                    <h1 className="rest-title">
                        Give yourself a pat on the back.
                    </h1>
                    <p className="rest-sub">
                        Even a small <em>“attaboy”</em> or <em>“attagirl”</em>{" "}
                        makes a difference.
                    </p>
                </header>

                <ol className="rest-list">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={`rest-item ${checked[item.id] ? "is-checked" : ""}`}
                        >
                            <button
                                className="rest-checkbox"
                                onClick={() => toggle(item.id)}
                                aria-pressed={!!checked[item.id]}
                            >
                                <span className="rest-checkbox-box">
                                    {checked[item.id] ? (
                                        <span className="rest-check">✓</span>
                                    ) : (
                                        <span className="rest-check-empty">
                                            {" "}
                                        </span>
                                    )}
                                </span>
                            </button>
                            {editing === item.id ? (
                                <input
                                    ref={(r) => { if (r && editing === item.id) r.focus(); }}
                                    className="rest-item-input"
                                    defaultValue={item.title}
                                    onBlur={(e) =>
                                        updateItem(item.id, e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
                                        }
                                        if (e.key === "Escape")
                                            setEditing(null);
                                    }}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="rest-item-title"
                                    onClick={() => setEditing(item.id)}
                                    style={{ background: "none", border: "none", font: "inherit", color: "inherit", padding: 0, textAlign: "left", cursor: "text" }}
                                >
                                    {item.title}
                                </button>
                            )}
                            <button
                                className="rest-item-x"
                                onClick={() => removeItem(item.id)}
                                title="Remove"
                                tabIndex={-1}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                    <li className="rest-item rest-item-add">
                        <span className="rest-checkbox rest-checkbox-add">
                            <span className="rest-checkbox-box rest-checkbox-box-add">
                                +
                            </span>
                        </span>
                        {adding ? (
                            <input
                                ref={(r) => { if (r && adding) r.focus(); }}
                                className="rest-item-input"
                                placeholder="new rest item…"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={addItem}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") addItem();
                                    if (e.key === "Escape") {
                                        setAdding(false);
                                        setDraft("");
                                    }
                                }}
                            />
                        ) : (
                            <button
                                className="rest-item-add-btn"
                                onClick={() => setAdding(true)}
                            >
                                add a rest item
                            </button>
                        )}
                    </li>
                </ol>

                <section className="rest-reward">
                    <header className="rest-reward-hd">
                        <span className="bracket">▸</span>
                        <span className="rest-reward-title">
                            Reward yourself
                        </span>
                        <span className="rest-reward-warn">
                            — not by procrastinating!
                        </span>
                    </header>
                    <button
                        type="button"
                        className="rest-reward-link"
                        style={{ background: "none", border: "none", font: "inherit", color: "inherit", padding: 0, textAlign: "left", cursor: "pointer", display: "inline-flex" }}
                    >
                        <span className="rest-reward-link-bracket">[</span>
                        <span className="rest-reward-link-text">
                            Tactical Procrastination
                        </span>
                        <span className="rest-reward-link-bracket">]</span>
                        <span className="rest-reward-link-arrow">↗</span>
                    </button>
                </section>

                {allChecked && (
                    <div className="rest-complete">
                        <span className="bracket">└─</span>
                        <span className="rest-complete-text">
                            all good. back to work when you're ready.
                        </span>
                        <span className="bracket">─┘</span>
                    </div>
                )}
            </div>
        </div>
    );
}
