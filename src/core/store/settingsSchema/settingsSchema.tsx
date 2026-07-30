/* oxlint-disable max-lines -- It's nice to have all the settings in one file. */

import {
    ExportDataButton,
    ImportTasksButton,
    LogoutButton,
    ClearAllDataButton,
} from "../../../screens/settings/SettingActions";
import type { SettingSchema, AppSettings } from "./settingsTypes";
export type * from "./settingsTypes";

type ConfigItem =
    | Omit<import("./settingsTypes").SelectSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").NumberSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").CheckboxSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").TimeSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").KeybindingSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").TextareaSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").CustomSettingSchema, "tab" | "section">
    | Omit<import("./settingsTypes").ActionSettingSchema, "tab" | "section">;

const SETTINGS_CONFIG: Record<string, Record<string, ConfigItem[]>> = {
    plan_screen: {
        "Calendar": [
            {
                id: "defaultCalendarView",
                label: "Default View",
                keywords: ["calendar", "view", "month", "week"],
                type: "select",
                defaultValue: "month",
                options: [
                    { value: "month", label: "Month" },
                    { value: "week", label: "Week" },
                ],
            },
            {
                id: "defaultTaskDuration",
                label: "Default Duration",
                keywords: ["task", "duration", "estimate", "time"],
                type: "select",
                defaultValue: 0,
                options: [
                    { value: 0, label: "Not set" },
                    { value: 15, label: "15m" },
                    { value: 30, label: "30m" },
                    { value: 45, label: "45m" },
                ],
            },
        ],
    },
    wrap_screen: {
        "Time & Routine": [
            {
                id: "earliest_wake_time",
                label: "Earliest wake time",
                keywords: ["wake", "morning", "start", "time"],
                type: "time",
                defaultValue: 480,
            },
            {
                id: "last_sleep_time",
                label: "Latest sleep time",
                keywords: ["sleep", "night", "end", "time"],
                type: "time",
                defaultValue: 1320,
            },
        ],
    },
    recap_screen: {
        "Recap": [
            {
                id: "recapDay",
                label: "Recap Day",
                keywords: ["recap", "weekly", "review"],
                type: "select",
                defaultValue: "",
                options: [
                    { value: "", label: "Never" },
                    { value: "monday", label: "Mon" },
                    { value: "tuesday", label: "Tue" },
                    { value: "wednesday", label: "Wed" },
                    { value: "thursday", label: "Thu" },
                    { value: "friday", label: "Fri" },
                    { value: "saturday", label: "Sat" },
                    { value: "sunday", label: "Sun" },
                ],
            },
        ],
    },
    do_screen: {
        "Stopwatch": [
            {
                id: "clockStyle",
                label: "Clock Style",
                keywords: ["stopwatch", "timer", "guzey", "counter", "flowtime"],
                type: "select",
                defaultValue: "counter",
                options: [
                    { value: "counter", label: "Counter" },
                    { value: "flowtime", label: "Flowtime" },
                    { value: "guzey", label: "Guzey" },
                ],
            },
            {
                id: "allowStopwatchWithoutTask",
                label: "Allow stopwatch use without selecting task",
                keywords: ["stopwatch", "task", "requirement", "allow"],
                type: "checkbox",
                defaultValue: false,
            },
            {
                id: "flowtimeBreakDivisor",
                label: "Flowtime Break Divisor",
                description:
                    "How much break time you earn (e.g. 5 means 1 min break for every 5 mins of work).",
                keywords: ["flowtime", "break", "divisor", "rest"],
                type: "number",
                defaultValue: 5,
                min: 1,
            },
        ],
    },
    sync: {
        "Sync & Integrations": [
            {
                id: "enableCalendarSync",
                label: "Enable Bidirectional Google Calendar Sync",
                description: "Self explanatory.",
                keywords: ["google", "calendar", "sync", "events"],
                type: "checkbox",
                defaultValue: true,
            },
            {
                id: "enableTasksSync",
                label: "Enable Bidirectional Google Tasks Sync",
                description: "Self explanatory.",
                keywords: ["google", "tasks", "sync", "todos"],
                type: "checkbox",
                defaultValue: true,
            },
            {
                id: "syncInterval",
                label: "Sync Interval (minutes)",
                keywords: ["sync", "interval", "poll", "time"],
                type: "number",
                defaultValue: 5,
                min: 1,
            },
            {
                id: "logout",
                label: "Sign out",
                description: "Sign out of your Google account.",
                keywords: ["logout", "signout", "google", "account"],
                type: "custom",
                render: () => <LogoutButton />,
            },
        ],
        "Data Management": [
            {
                id: "exportData",
                label: "Export Data as JSON",
                description: "It stands for Jason's Object Notation.",
                keywords: ["export", "backup", "json", "data"],
                type: "custom",
                render: () => <ExportDataButton />,
            },
            {
                id: "importTasks",
                label: "Bulk Import Tasks",
                description:
                    "Paste in tasks separated by newlines. They will be added as new tasks to the top of your list.",
                keywords: ["import", "bulk", "tasks", "add", "text"],
                type: "custom",
                render: (props) => <ImportTasksButton {...props} />,
            },
        ],
        "Danger Zone": [
            {
                id: "clearAllData",
                label: "Clear All Data",
                description:
                    "Permanently delete all your tasks, settings, logs, and other data from both this device and the cloud. This cannot be undone.",
                keywords: ["delete", "clear", "wipe", "reset", "factory", "all"],
                type: "custom",
                render: () => <ClearAllDataButton />,
                danger: true,
            },
        ],
    },
    keybindings: {
        "Keybindings": [
            {
                id: "keybindingOpenSettings",
                label: "Open Settings",
                keywords: ["keyboard", "shortcut", "settings", "open"],
                type: "keybinding",
                defaultValue: "Ctrl+,",
            },
            {
                id: "keybindingRestoreApp",
                label: "Restore App",
                keywords: [
                    "keyboard",
                    "shortcut",
                    "restore",
                    "maximize",
                    "mini tracker",
                    "minitracker",
                ],
                type: "keybinding",
                defaultValue: "Ctrl+Alt+R",
            },
        ],
    },
    tracker_window: {
        "Appearance": [
            {
                id: "trackerShowBorder",
                label: "Show Window Border",
                keywords: ["tracker", "border", "show", "outline"],
                type: "checkbox",
                defaultValue: true,
            },
            {
                id: "trackerFontSize",
                label: "Font Size",
                keywords: ["tracker", "font", "size", "text", "scale", "dynamic"],
                type: "select",
                defaultValue: "dynamic",
                options: [
                    { value: "dynamic", label: "Dynamic" },
                    { value: 12, label: "12px" },
                    { value: 16, label: "16px" },
                    { value: 20, label: "20px" },
                    { value: 24, label: "24px" },
                    { value: 32, label: "32px" },
                    { value: 48, label: "48px" },
                    { value: 64, label: "64px" },
                ],
            },
            {
                id: "trackerOpacity",
                label: "Base Opacity (%)",
                description:
                    "The baseline opacity of the mini tracker window (0 to 100).",
                keywords: ["tracker", "opacity", "transparent", "window"],
                type: "number",
                defaultValue: 80,
                min: 0,
                max: 100,
            },
            {
                id: "trackerHoverReduction",
                label: "Hover Opacity Reduction (%)",
                description:
                    "Amount by which opacity reduces when the mouse hovers over the window (0 to 100).",
                keywords: ["tracker", "opacity", "hover", "reduce"],
                type: "number",
                defaultValue: 20,
                min: 0,
                max: 100,
            },
            {
                id: "trackerDimmedOpacity",
                label: "Dimmed Opacity (%)",
                description: "The opacity of the window when dimmed by pressing H.",
                keywords: ["tracker", "opacity", "dim", "hide", "h"],
                type: "number",
                defaultValue: 20,
                min: 0,
                max: 100,
            },
            {
                id: "trackerSnapThreshold",
                label: "Edge Snap Threshold (px)",
                description: "How close to the edge (in pixels) the window needs to be to snap.",
                keywords: ["tracker", "snap", "edge", "threshold", "pixels"],
                type: "number",
                defaultValue: 2,
                min: 0,
                max: 100,
            },
        ],
    },
};

export const SETTINGS_SCHEMA: SettingSchema[] = Object.entries(SETTINGS_CONFIG).flatMap(
    ([tab, sections]) =>
        Object.entries(sections).flatMap(([section, settings]) =>
            settings.map((setting) => {
                const schemaItem: SettingSchema = {
                    ...setting,
                    tab,
                    section,
                };
                return schemaItem;
            })
        )
);

export const SETTINGS_TABS = [
    { id: "plan_screen", label: "Plan screen" },
    { id: "do_screen", label: "Do screen" },
    { id: "wrap_screen", label: "Wrap screen" },
    { id: "recap_screen", label: "Recap screen" },
    { id: "tracker_window", label: "Tracker window" },
    { id: "sync", label: "Sync and Backup" },
    { id: "keybindings", label: "Keybindings" },
];

const generateDefaultSettings = (): AppSettings => {
    const defaults: Record<string, unknown> = {};
    for (const setting of SETTINGS_SCHEMA) {
        if ("defaultValue" in setting) {
            defaults[setting.id] = setting.defaultValue;
        }
    }
    // Type assertion is necessary here because we are dynamically building
    // the defaults object at runtime from the schema, so TypeScript cannot
    // infer that it perfectly satisfies the AppSettings interface.
    // @ts-expect-error type
    return defaults;
};

export const DEFAULT_SETTINGS: AppSettings = generateDefaultSettings();

