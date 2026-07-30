import type { ReactNode, Dispatch, SetStateAction } from "react";

export type RecapDay =
    | ""
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

export interface AppSettings {
    defaultCalendarView: "month" | "week";
    defaultTaskDuration: number;
    earliest_wake_time: number;
    last_sleep_time: number;
    recapDay: RecapDay;
    clockStyle: "counter" | "flowtime" | "guzey";
    allowStopwatchWithoutTask: boolean;
    flowtimeBreakDivisor: number;
    enableCalendarSync: boolean;
    enableTasksSync: boolean;
    syncInterval: number;
    keybindingOpenSettings: string;
    keybindingRestoreApp: string;
    trackerOpacity: number;
    trackerHoverReduction: number;
    trackerDimmedOpacity: number;
    trackerShowBorder: boolean;
    trackerSnapThreshold: number;
}

export type SettingType =
    | "select"
    | "time"
    | "number"
    | "checkbox"
    | "action"
    | "textarea"
    | "keybinding"
    | "custom";

interface BaseSettingSchema<T extends SettingType> {
    type: T;
    section: string;
    tab: string;
    label: string;
    description?: string;
    keywords?: string[];
    beta?: boolean;
    danger?: boolean;
    showIf?: (settings: AppSettings) => boolean;
}

interface DataSettingSchema<T extends SettingType, K extends keyof AppSettings> extends BaseSettingSchema<T> {
    id: K;
    defaultValue: AppSettings[K];
}

export interface SelectSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"select", K> {
    options: { label: string; value: AppSettings[K] }[];
}

export interface NumberSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"number", K> {
    min?: number;
    max?: number;
}

export interface CheckboxSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"checkbox", K> {}

export interface TimeSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"time", K> {}

export interface KeybindingSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"keybinding", K> {}

export interface TextareaSettingSchema<K extends keyof AppSettings = keyof AppSettings> extends DataSettingSchema<"textarea", K> {
    placeholder?: string;
}

export interface CustomSettingSchema extends BaseSettingSchema<"custom"> {
    id: string; // Not tied to AppSettings state
    render?: (props: { settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>> }) => ReactNode;
}

export interface ActionSettingSchema extends BaseSettingSchema<"action"> {
    id: string;
    action: string;
}

export type SettingSchema =
    | SelectSettingSchema
    | NumberSettingSchema
    | CheckboxSettingSchema
    | TimeSettingSchema
    | KeybindingSettingSchema
    | TextareaSettingSchema
    | CustomSettingSchema
    | ActionSettingSchema;
