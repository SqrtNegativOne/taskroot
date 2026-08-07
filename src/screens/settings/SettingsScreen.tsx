import { useState, useMemo } from "react";
import Fuse from "fuse.js";

import { SearchBar } from "../../components/search-bar";
import { useSettings } from "../../core/store/hooks";

import "./settings.css";
import {
    SETTINGS_SCHEMA,
    SETTINGS_TABS,
} from "../../core/store/settingsSchema";

import { SETTING_RENDERERS } from "./settingRegistry";

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
            const sectionArr = grouped[s.section];
            if (!sectionArr) {
                grouped[s.section] = [s];
            } else {
                sectionArr.push(s);
            }
        }
        return grouped;
    }, [displayedSettings]);

    const renderSetting = (setting: import('../../core/store/settingsSchema').SettingSchema) => {
        const currentVal = Reflect.get(settings, setting.id);
        const defaultValue = Reflect.get(setting, "defaultValue");
        const val = currentVal !== undefined ? currentVal : defaultValue;

        const isComplex = setting.type === "custom";
        const Renderer = SETTING_RENDERERS[setting.type];

        return (
            <div
                className="settings-section"
                key={setting.id}
                {...(setting.type === "checkbox" ? {
                    role: "button",
                    tabIndex: 0,
                    onClick: (e: React.MouseEvent) => {
                        const target = e.target;
                        if (target instanceof Element && (target.closest('button') || target.closest('.toggle-switch'))) {
                            return;
                        }
                        setSettings((prev: import('../../core/store/settingsSchema').AppSettings) => {
                            const defaultVal = Reflect.get(setting, "defaultValue");
                            const prevVal = Reflect.get(prev, setting.id) !== undefined ? Reflect.get(prev, setting.id) : defaultVal;
                            return { ...prev, [setting.id]: !prevVal };
                        });
                    },
                    onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSettings((prev: import('../../core/store/settingsSchema').AppSettings) => {
                                const defaultVal = Reflect.get(setting, "defaultValue");
                                const prevVal = Reflect.get(prev, setting.id) !== undefined ? Reflect.get(prev, setting.id) : defaultVal;
                                return { ...prev, [setting.id]: !prevVal };
                            });
                        }
                    }
                } : {})}
                style={{
                    marginBottom: setting.danger ? "32px" : "12px",
                    display: "flex",
                    flexDirection: isComplex ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isComplex ? "flex-start" : "center",
                    gap: isComplex ? "8px" : "16px",
                    cursor: setting.type === "checkbox" ? "pointer" : "default",
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    color: "inherit",
                    textAlign: "left",
                    width: "100%",
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
        <>
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
                                    role="tab"
                                    tabIndex={0}
                                    className={`task-row ${activeTab === tab.id ? "is-active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setActiveTab(tab.id);
                                        }
                                    }}
                                    style={{ cursor: "pointer" }}
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
        </>
    );
}
