import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { TitleBar } from "../../components/shell";
import { SearchBar } from "../../components/search-bar";
import { useSettings } from "../../core/store/hooks";

import "./settings.css";
import {
    SETTINGS_SCHEMA,
    SETTINGS_TABS,
} from "../../core/store/settingsSchema";

import { SETTING_RENDERERS } from "./SettingRenderers";

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
                                <button type="button"
                                    key={tab.id}
                                    className={`task-row ${activeTab === tab.id ? "is-active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{ background: "none", border: "none", font: "inherit", color: "inherit", textAlign: "left", width: "100%", padding: 0 }}
                                    data-cuelume-hover="tick"
                                    data-cuelume-toggle
                                >
                                    <div className="task-row-title">
                                        {tab.label}
                                    </div>
                                </button>
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
