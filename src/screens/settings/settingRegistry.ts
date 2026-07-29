import React from "react";
import type { SettingRendererProps } from "./SettingRenderers";
import {
    SelectSetting,
    TimeSetting,
    NumberSetting,
    CheckboxSetting,
    KeybindingSetting,
    CustomSetting,
} from "./SettingRenderers";

export const SETTING_RENDERERS: Record<string, React.FC<SettingRendererProps>> = {
    select: SelectSetting,
    time: TimeSetting,
    number: NumberSetting,
    checkbox: CheckboxSetting,
    keybinding: KeybindingSetting,
    custom: CustomSetting,
};
