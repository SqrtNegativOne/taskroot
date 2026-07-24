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

const SelectSetting = ({ setting, val, settings, setSettings }: any) => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
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
    </div>
);

const TimeSetting = ({ setting, val, settings, setSettings }: any) => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <TimeInput
            value={typeof val === "number" ? minToTime(val) : "00:00"}
            onChange={(v) => setSettings({ ...settings, [setting.id]: timeToMin(v) })}
        />
    </div>
);

const NumberSetting = ({ setting, val, settings, setSettings }: any) => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--fg)" }}>
        <NumberInput
            min={setting.min}
            max={setting.max}
            value={typeof val === "number" || typeof val === "string" ? val : ""}
            onChange={(v) => setSettings({ ...settings, [setting.id]: v })}
        />
    </div>
);

const CheckboxSetting = ({ setting, val, settings, setSettings }: any) => (
    <ToggleSwitch
        checked={val}
        onChange={(checked) => setSettings({ ...settings, [setting.id]: checked })}
    />
);

const KeybindingSetting = ({ setting, val, settings, setSettings }: any) => (
    <KeybindingInput
        value={typeof val === "string" || typeof val === "number" ? val : ""}
        onChange={(v) => setSettings({ ...settings, [setting.id]: v })}
    />
);

const CustomSetting = ({ setting, settings, setSettings }: any) => {
    return setting.render?.({ settings, setSettings }) || null;
};

export const SETTING_RENDERERS: Record<string, React.FC<any>> = {
    select: SelectSetting,
    time: TimeSetting,
    number: NumberSetting,
    checkbox: CheckboxSetting,
    keybinding: KeybindingSetting,
    custom: CustomSetting,
};
