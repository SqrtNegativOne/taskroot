import type { ReactNode } from 'react';
import { ExportDataButton, ImportTasksButton, LogoutButton, ClearAllDataButton } from '../screens/settings/SettingActions';

export interface AppSettings {
  defaultCalendarView: 'month' | 'week';

  defaultTaskDuration: number;
  earliest_wake_time: number;
  last_sleep_time: number;
  recapDay: string;
  clockStyle: 'counter' | 'flowtime' | 'guzey';
  allowStopwatchWithoutTask: boolean;
  flowtimeBreakDivisor: number;
  enableFirebaseSync: boolean;
  enableCalendarSync: boolean;
  enableTasksSync: boolean;
  keybindingOpenSettings: string;
  keybindingRestoreApp: string;
  [key: string]: any; // Allow custom actions/etc if needed, though they shouldn't store values.
}

export type SettingType = 'select' | 'time' | 'number' | 'checkbox' | 'action' | 'textarea' | 'keybinding' | 'custom';
export interface SettingSchema {
  id: string;
  section: string;
  tab: string;
  label: string;
  description?: string;
  keywords?: string[];
  type: SettingType;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  action?: string;
  placeholder?: string;
  beta?: boolean;
  danger?: boolean;
  render?: (props: { settings: any, setSettings: any }) => ReactNode;
  showIf?: (settings: any) => boolean;
}

export const SETTINGS_SCHEMA: SettingSchema[] = [
  {
    id: 'defaultCalendarView',
    section: 'Calendar',
    tab: 'general',
    label: 'Default View',
    keywords: ['calendar', 'view', 'month', 'week'],
    type: 'select',
    defaultValue: 'month',
    options: [
      { value: 'month', label: 'Month' },
      { value: 'week', label: 'Week' }
    ]
  },

  {
    id: 'defaultTaskDuration',
    section: 'Tasks',
    tab: 'general',
    label: 'Default Duration',
    keywords: ['task', 'duration', 'estimate', 'time'],
    type: 'select',
    defaultValue: 0,
    options: [
      { value: 0, label: 'Not set' },
      { value: 15, label: '15m' },
      { value: 30, label: '30m' },
      { value: 45, label: '45m' },
    ]
  },
  {
    id: 'earliest_wake_time',
    section: 'Time & Routine',
    tab: 'wrap_screen',
    label: 'Earliest wake time',
    keywords: ['wake', 'morning', 'start', 'time'],
    type: 'time',
    defaultValue: 480
  },
  {
    id: 'last_sleep_time',
    section: 'Time & Routine',
    tab: 'wrap_screen',
    label: 'Latest sleep time',
    keywords: ['sleep', 'night', 'end', 'time'],
    type: 'time',
    defaultValue: 1320
  },
  {
    id: 'recapDay',
    section: 'Recap',
    tab: 'recap_screen',
    label: 'Recap Day',
    keywords: ['recap', 'weekly', 'review'],
    type: 'select',
    defaultValue: '',
    options: [
      { value: '', label: 'Never' },
      { value: 'monday', label: 'Mon' },
      { value: 'tuesday', label: 'Tue' },
      { value: 'wednesday', label: 'Wed' },
      { value: 'thursday', label: 'Thu' },
      { value: 'friday', label: 'Fri' },
      { value: 'saturday', label: 'Sat' },
      { value: 'sunday', label: 'Sun' }
    ]
  },
  {
    id: 'clockStyle',
    section: 'Stopwatch',
    tab: 'do_screen',
    label: 'Clock Style',
    keywords: ['stopwatch', 'timer', 'guzey', 'counter', 'flowtime'],
    type: 'select',
    defaultValue: 'counter',
    options: [
      { value: 'counter', label: 'Counter' },
      { value: 'flowtime', label: 'Flowtime' },
      { value: 'guzey', label: 'Guzey' }
    ]
  },
  {
    id: 'allowStopwatchWithoutTask',
    section: 'Stopwatch',
    tab: 'do_screen',
    label: 'Allow stopwatch use without selecting task',
    keywords: ['stopwatch', 'task', 'requirement', 'allow'],
    type: 'checkbox',
    defaultValue: false
  },
  {
    id: 'flowtimeBreakDivisor',
    section: 'Stopwatch',
    tab: 'do_screen',
    label: 'Flowtime Break Divisor',
    description: 'How much break time you earn (e.g. 5 means 1 min break for every 5 mins of work).',
    keywords: ['flowtime', 'break', 'divisor', 'rest'],
    type: 'number',
    defaultValue: 5,
    min: 1
  },
  {
    id: 'enableFirebaseSync',
    section: 'Sync & Integrations',
    tab: 'sync',
    label: 'Enable Firebase Sync',
    description: 'Sync your data across devices using Firebase.',
    keywords: ['firebase', 'sync', 'cloud', 'backup'],
    type: 'checkbox',
    defaultValue: true
  },
  {
    id: 'enableCalendarSync',
    section: 'Sync & Integrations',
    tab: 'sync',
    label: 'Enable Bidirectional Google Calendar Sync',
    description: 'Self explanatory.',
    keywords: ['google', 'calendar', 'sync', 'events'],
    type: 'checkbox',
    defaultValue: true
  },
  {
    id: 'enableTasksSync',
    section: 'Sync & Integrations',
    tab: 'sync',
    label: 'Enable Bidirectional Google Tasks Sync',
    description: 'Self explanatory.',
    keywords: ['google', 'tasks', 'sync', 'todos'],
    type: 'checkbox',
    defaultValue: true
  },
  {
    id: 'logout',
    section: 'Sync & Integrations',
    tab: 'sync',
    label: 'Sign out',
    description: 'Sign out of your Google / Firebase account.',
    keywords: ['logout', 'signout', 'google', 'firebase', 'account'],
    type: 'custom',
    render: () => <LogoutButton />
  },
  {
    id: 'exportData',
    section: 'Data Management',
    tab: 'sync',
    label: 'Export Data as JSON',
    description: 'It stands for Jason\'s Object Notation.',
    keywords: ['export', 'backup', 'json', 'data'],
    type: 'custom',
    render: () => <ExportDataButton />
  },
  {
    id: 'importTasks',
    section: 'Data Management',
    tab: 'sync',
    label: 'Bulk Import Tasks',
    description: 'Paste in tasks separated by newlines. They will be added as new tasks to the top of your list.',
    keywords: ['import', 'bulk', 'tasks', 'add', 'text'],
    type: 'custom',
    render: (props) => <ImportTasksButton {...props} />
  },

  {
    id: 'clearAllData',
    section: 'Danger Zone',
    tab: 'sync',
    label: 'Clear All Data',
    description: 'Permanently delete all your tasks, settings, logs, and other data from both this device and the cloud. This cannot be undone.',
    keywords: ['delete', 'clear', 'wipe', 'reset', 'factory', 'all'],
    type: 'custom',
    render: () => <ClearAllDataButton />,
    danger: true
  },
  {
    id: 'keybindingOpenSettings',
    section: 'Keybindings',
    tab: 'keybindings',
    label: 'Open Settings',
    keywords: ['keyboard', 'shortcut', 'settings', 'open'],
    type: 'keybinding',
    defaultValue: 'Ctrl+,'
  },
  {
    id: 'keybindingRestoreApp',
    section: 'Keybindings',
    tab: 'keybindings',
    label: 'Restore App',
    keywords: ['keyboard', 'shortcut', 'restore', 'maximize', 'mini tracker', 'minitracker'],
    type: 'keybinding',
    defaultValue: 'Ctrl+Alt+R'
  },
  {
    id: 'trackerShowBorder',
    section: 'Appearance',
    tab: 'tracker_window',
    label: 'Show Window Border',
    keywords: ['tracker', 'border', 'show', 'outline'],
    type: 'checkbox',
    defaultValue: true
  },
  {
    id: 'trackerOpacity',
    section: 'Appearance',
    tab: 'tracker_window',
    label: 'Base Opacity (%)',
    description: 'The baseline opacity of the mini tracker window (0 to 100).',
    keywords: ['tracker', 'opacity', 'transparent', 'window'],
    type: 'number',
    defaultValue: 80,
    min: 0,
    max: 100
  },
  {
    id: 'trackerHoverReduction',
    section: 'Appearance',
    tab: 'tracker_window',
    label: 'Hover Opacity Reduction (%)',
    description: 'Amount by which opacity reduces when the mouse hovers over the window (0 to 100).',
    keywords: ['tracker', 'opacity', 'hover', 'reduce'],
    type: 'number',
    defaultValue: 20,
    min: 0,
    max: 100
  },
  {
    id: 'trackerDimmedOpacity',
    section: 'Appearance',
    tab: 'tracker_window',
    label: 'Dimmed Opacity (%)',
    description: 'The opacity of the window when dimmed by pressing H.',
    keywords: ['tracker', 'opacity', 'dim', 'hide', 'h'],
    type: 'number',
    defaultValue: 20,
    min: 0,
    max: 100
  }
];

export const SETTINGS_TABS = [
  { id: 'general', label: 'Plan screen' },
  { id: 'do_screen', label: 'Do screen' },
  { id: 'wrap_screen', label: 'Wrap screen' },
  { id: 'recap_screen', label: 'Recap screen' },
  { id: 'sync', label: 'Sync and Backup' },
  { id: 'keybindings', label: 'Keybindings' },
  { id: 'tracker_window', label: 'Tracker window' }
];

export const DEFAULT_SETTINGS = SETTINGS_SCHEMA.reduce((acc, schema) => {
  if (schema.defaultValue !== undefined) {
    acc[schema.id] = schema.defaultValue;
  }
  return acc;
}, {} as AppSettings);
