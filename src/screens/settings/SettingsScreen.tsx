import React, { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { TitleBar } from "../../components/shell";
import { SearchBar } from "../../components/search-bar";
import { useSettings } from "../../core/store/hooks";

import "./settings.css";
import {
    SETTINGS_SCHEMA,
    SETTINGS_TABS,
} from "../../core/store/settingsSchema";

function minToTime(m: number) {
    if (typeof m !== "number" || isNaN(m)) return "";
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

function timeToMin(t: string) {
    if (!t) return 0;
    const [hh, mm] = t.split(":");
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

interface SegmentedControlProps<T> {
    options: { label: string; value: T }[];
    value: T;
    onChange: (val: T) => void;
}

function SegmentedControl<T>({
    options,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [thumbStyle, setThumbStyle] = React.useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        opacity: 0,
        init: false,
    });

    React.useLayoutEffect(() => {
        const updateThumb = () => {
            if (!containerRef.current) return;
            const activeBtn = containerRef.current.querySelector(
                'button[data-active="true"]',
            );
            if (activeBtn instanceof HTMLButtonElement) {
                setThumbStyle({
                    left: activeBtn.offsetLeft,
                    top: activeBtn.offsetTop,
                    width: activeBtn.offsetWidth,
                    height: activeBtn.offsetHeight,
                    opacity: 1,
                    init: true,
                });
            } else {
                setThumbStyle((prev) => ({ ...prev, opacity: 0, init: true }));
            }
        };

        updateThumb();

        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
            const ro = new ResizeObserver(updateThumb);
            ro.observe(containerRef.current);
            return () => ro.disconnect();
        }
    }, [value, options]);

    return (
        <div
            ref={containerRef}
            style={{
                display: "inline-flex",
                position: "relative",
                background: "var(--bg-app)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                userSelect: "none",
                flexWrap: "wrap",
                gap: "2px",
                zIndex: 0,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    background: "var(--bg-surface)",
                    borderRadius: "5px",
                    boxShadow:
                        "0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)",
                    transition: thumbStyle.init
                        ? "all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)"
                        : "none",
                    left: thumbStyle.left,
                    top: thumbStyle.top,
                    width: thumbStyle.width,
                    height: thumbStyle.height,
                    opacity: thumbStyle.opacity,
                    zIndex: -1,
                }}
            />
            {options.map((opt) => (
                <button
                    type="button"
                    key={String(opt.value)}
                    data-active={opt.value === value}
                    onClick={() => onChange(opt.value)}
                    data-cuelume-toggle
                    style={{
                        appearance: "none",
                        background: "transparent",
                        border: "none",
                        borderRadius: "5px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        cursor: "pointer",
                        color:
                            opt.value === value ? "var(--fg)" : "var(--fg-dim)",
                        fontWeight: opt.value === value ? 500 : 400,
                        transition:
                            "color 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)",
                        flex: "1 1 auto",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

const SelectSetting = ({ setting, val, settings, setSettings }: any) => (
    <label style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <SegmentedControl
            value={val}
            onChange={(v: unknown) =>
                setSettings({
                    ...settings,
                    [setting.id]: typeof val === "number" ? Number(v) : v,
                })
            }
            options={setting.options}
        />
    </label>
);

const TimeSetting = ({ setting, val, settings, setSettings }: any) => (
    <label style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <input
            type="time"
            value={typeof val === "number" ? minToTime(val) : "00:00"}
            onChange={(e) =>
                setSettings({ ...settings, [setting.id]: timeToMin(e.target.value) })
            }
            style={{
                background: "var(--bg-input)", color: "var(--fg)", border: "1px solid var(--border)",
                borderRadius: "4px", padding: "4px 8px"
            }}
        />
    </label>
);

const NumberSetting = ({ setting, val, settings, setSettings }: any) => (
    <label style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <input
            type="number"
            min={setting.min}
            max={setting.max}
            value={typeof val === "number" || typeof val === "string" ? val : ""}
            onChange={(e) =>
                setSettings({ ...settings, [setting.id]: Number(e.target.value) || 0 })
            }
            style={{
                background: "var(--bg-input)", color: "var(--fg)", border: "1px solid var(--border)",
                borderRadius: "4px", padding: "4px 8px", width: "80px"
            }}
        />
    </label>
);

const CheckboxSetting = ({ setting, val, settings, setSettings }: any) => (
    <div
        style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)", cursor: "pointer" }}
        onClick={() => setSettings({ ...settings, [setting.id]: !val })}
        data-cuelume-toggle
    >
        <div className={`toggle-switch ${val ? "is-on" : ""}`}>
            <div className="toggle-switch-thumb" />
        </div>
    </div>
);

const KeybindingSetting = ({ setting, val, settings, setSettings }: any) => {
    const [isRecording, setIsRecording] = useState(false);
    return (
        <kbd
            style={{
                padding: "4px 8px",
                background: isRecording ? "var(--accent-soft)" : "var(--bg-app)",
                border: "1px solid " + (isRecording ? "var(--accent)" : "var(--border)"),
                borderRadius: "4px", fontSize: "0.9em", fontFamily: "monospace", cursor: "pointer",
                color: "var(--fg)", display: "inline-block"
            }}
            onClick={(e) => {
                e.preventDefault();
                setIsRecording(true);
                const handler = (evt: KeyboardEvent) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (evt.key === "Escape") {
                        setIsRecording(false);
                        window.removeEventListener("keydown", handler);
                        return;
                    }
                    const parts = [];
                    if (evt.ctrlKey) parts.push("Ctrl");
                    if (evt.metaKey) parts.push("Meta");
                    if (evt.altKey) parts.push("Alt");
                    if (evt.shiftKey) parts.push("Shift");
                    if (!["Control", "Meta", "Alt", "Shift"].includes(evt.key)) {
                        parts.push(evt.key === " " ? "Space" : evt.key.length === 1 ? evt.key.toUpperCase() : evt.key);
                        setSettings({ ...settings, [setting.id]: parts.join("+") });
                        setIsRecording(false);
                        window.removeEventListener("keydown", handler);
                    }
                };
                window.addEventListener("keydown", handler);
            }}
        >
            {isRecording ? "Press any key..." : typeof val === "string" || typeof val === "number" ? val : ""}
        </kbd>
    );
};

const CustomSetting = ({ setting, settings, setSettings }: any) => {
    return setting.render?.({ settings, setSettings }) || null;
};

const SETTING_RENDERERS: Record<string, React.FC<any>> = {
    select: SelectSetting,
    time: TimeSetting,
    number: NumberSetting,
    checkbox: CheckboxSetting,
    keybinding: KeybindingSetting,
    custom: CustomSetting
};

export function SettingsScreen() {
    const [activeTab, setActiveTab] = useState("general");
    const [settings, setSettings] = useSettings();
    const [searchQuery, setSearchQuery] = useState("");

    const fuse = useMemo(
        () =>
            new Fuse(SETTINGS_SCHEMA, {
                keys: ["label", "description", "keywords", "section"],
                threshold: 0.3,
            }),
        [],
    );

    const displayedSettings = useMemo(() => {
        let matches = SETTINGS_SCHEMA;
        if (searchQuery.trim()) {
            matches = fuse.search(searchQuery).map((res) => res.item);
        } else {
            matches = SETTINGS_SCHEMA.filter((s) => s.tab === activeTab);
        }
        return matches.filter((s) => !s.showIf || s.showIf(settings));
    }, [searchQuery, activeTab, fuse, settings]);

    const settingsBySection = useMemo(() => {
        const grouped: Record<string, typeof SETTINGS_SCHEMA> = {};
        for (const s of displayedSettings) {
            if (!grouped[s.section]) grouped[s.section] = [];
            grouped[s.section].push(s);
        }
        return grouped;
    }, [displayedSettings]);

    const renderSetting = (setting: import('../../core/store/settingsSchema').SettingSchema) => {
        const val =
            settings[setting.id] !== undefined
                ? settings[setting.id]
                : setting.defaultValue;

        const isComplex = setting.type === "custom";
        const Renderer = SETTING_RENDERERS[setting.type];

        return (
            <div
                className="settings-section"
                key={setting.id}
                style={{
                    marginBottom: setting.danger ? "32px" : "12px",
                    display: "flex",
                    flexDirection: isComplex ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isComplex ? "flex-start" : "center",
                    gap: isComplex ? "8px" : "16px",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <div className="settings-section-title" style={{ color: setting.danger ? "var(--red)" : undefined }}>
                        {setting.label} {setting.beta && <span className="status-pill status-nextup">BETA</span>}
                    </div>
                    {setting.description && (
                        <div className="settings-section-desc dim" style={{ marginBottom: 0 }}>
                            {setting.description}
                        </div>
                    )}
                </div>
                <div
                    className="settings-section-actions"
                    style={{
                        margin: 0,
                        flexShrink: 0,
                        display: setting.danger ? "flex" : "block",
                        justifyContent: setting.danger ? "flex-end" : "flex-start",
                    }}
                >
                    {Renderer && <Renderer setting={setting} val={val} settings={settings} setSettings={setSettings} />}
                </div>
            </div>
        );
    };

    return (
        <div className="app app-settings">
            <TitleBar current="settings"  />
            <div className="main settings-main">
                <div
                    className="task-pane settings-sidebar"
                    style={{ display: "flex", flexDirection: "column" }}
                >
                    <div className="task-pane-hd">
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
                    </div>

                    {!searchQuery && (
                        <div className="task-list">
                            {SETTINGS_TABS.map((tab) => (
                                <div
                                    key={tab.id}
                                    className={`task-row ${activeTab === tab.id ? "is-active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    data-cuelume-hover="tick"
                                    data-cuelume-toggle
                                >
                                    <div className="task-row-title">
                                        {tab.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="right-pane settings-content">
                    <div className="settings-detail-pane">
                        {Object.entries(settingsBySection).map(
                            ([section, settingsList]) => (
                                <div
                                    key={section}
                                    style={{ marginBottom: "32px" }}
                                >
                                    <h3
                                        style={{
                                            margin: "0 0 16px 0",
                                            fontSize: "18px",
                                            color: "var(--fg)",
                                            borderBottom:
                                                "1px solid var(--border)",
                                            paddingBottom: "8px",
                                        }}
                                    >
                                        {section}
                                    </h3>
                                    {settingsList.map(renderSetting)}
                                </div>
                            ),
                        )}

                        {displayedSettings.length === 0 && (
                            <div
                                style={{
                                    padding: "32px",
                                    textAlign: "center",
                                    color: "var(--fg-dim)",
                                }}
                            >
                                No settings found for "{searchQuery}".
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
