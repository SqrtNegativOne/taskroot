import type { SettingSchema, AppSettings } from "../../core/store/settingsSchema";
import React from "react";
import {
    SegmentedControl,
    TimeInput,
    NumberInput,
    ToggleSwitch,
    KeybindingInput,
} from "../../components/inputs";

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

export interface SettingRendererProps {
    setting: SettingSchema;
    val: unknown;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SelectSetting = ({ setting, val, settings, setSettings }: SettingRendererProps) => {
    const s = setting as import("../../core/store/settingsSchema").SelectSettingSchema;
    return (
        <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
            <SegmentedControl
                value={typeof val === "string" || typeof val === "number" ? String(val) : ""}
                onChange={(v: string) =>
                    setSettings({
                        ...settings,
                        [setting.id]: typeof val === "number" ? Number(v) : v,
                    })
                }
                options={s.options?.map((o: any) => ({ ...o, value: String(o.value) })) || []}
            />
        </div>
    );
};

const TimeSetting = ({ setting, val, settings, setSettings }: SettingRendererProps) => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <TimeInput
            value={typeof val === "number" ? minToTime(val) : "00:00"}
            onChange={(v) => setSettings({ ...settings, [setting.id]: timeToMin(v) })}
        />
    </div>
);

const NumberSetting = ({ setting, val, settings, setSettings }: SettingRendererProps) => {
    const s = setting as import("../../core/store/settingsSchema").NumberSettingSchema;
    return (
        <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
            <NumberInput
                min={s.min}
                max={s.max}
                value={typeof val === "number" || typeof val === "string" ? val : ""}
                onChange={(v) => setSettings({ ...settings, [setting.id]: v })}
            />
        </div>
    );
};

const CheckboxSetting = ({ setting, val, setSettings }: SettingRendererProps) => (
    <ToggleSwitch
        checked={Boolean(val)}
        onChange={(checked) => setSettings((prev: AppSettings) => ({ ...prev, [setting.id]: checked }))}
    />
);

const KeybindingSetting = ({ setting, val, settings, setSettings }: SettingRendererProps) => (
    <KeybindingInput
        value={typeof val === "string" || typeof val === "number" ? String(val) : ""}
        onChange={(v) => setSettings({ ...settings, [setting.id]: v })}
    />
);

const CustomSetting = ({ setting, settings, setSettings }: SettingRendererProps) => {
    const s = setting as import("../../core/store/settingsSchema").CustomSettingSchema;
    return s.render?.({ settings, setSettings }) || null;
};

export const SETTING_RENDERERS: Record<string, React.FC<SettingRendererProps>> = {
    select: SelectSetting,
    time: TimeSetting,
    number: NumberSetting,
    checkbox: CheckboxSetting,
    keybinding: KeybindingSetting,
    custom: CustomSetting,
};
