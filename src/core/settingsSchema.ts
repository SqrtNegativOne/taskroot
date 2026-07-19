export type SettingType = 'select' | 'time' | 'number' | 'checkbox' | 'action' | 'textarea' | 'keybinding';

export interface SettingSchema {
  id: string;
  section: string;
  tab: string;
  label: string;
  description: string;
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
}

export const SETTINGS_SCHEMA: SettingSchema[] = [
  {
    id: 'defaultCalendarView',
    section: 'Calendar',
    tab: 'general',
    label: 'Default View',
    description: 'Set your default calendar view.',
    keywords: ['calendar', 'view', 'month', 'week'],
    type: 'select',
    defaultValue: 'month',
    options: [
      { value: 'month', label: 'Month' },
      { value: 'week', label: 'Week' }
    ]
  },
  {
    id: 'categoryCalendars',
    section: 'Calendar Categories',
    tab: 'general',
    label: 'Calendar Categories',
    description: 'Map specific event categories to different Google Calendars.',
    keywords: ['google calendar', 'sync', 'categories', 'events'],
    type: 'action',
    action: 'calendarCategories',
    defaultValue: {}
  },
  {
    id: 'defaultTaskDuration',
    section: 'Tasks',
    tab: 'general',
    label: 'Default Duration',
    description: 'Set the default estimated duration for new tasks.',
    keywords: ['task', 'duration', 'estimate', 'time'],
    type: 'select',
    defaultValue: 0,
    options: [
      { value: 0, label: 'Not set' },
      { value: 15, label: '15m' },
      { value: 30, label: '30m' },
      { value: 45, label: '45m' },
      { value: 60, label: '1h' },
      { value: 90, label: '1.5h' },
      { value: 120, label: '2h' }
    ]
  },
  {
    id: 'earliest_wake_time',
    section: 'Time & Routine',
    tab: 'wrap_screen',
    label: 'Earliest wake time',
    description: 'Set your waking and sleeping hours for time tracking.',
    keywords: ['wake', 'morning', 'start', 'time'],
    type: 'time',
    defaultValue: 480
  },
  {
    id: 'last_sleep_time',
    section: 'Time & Routine',
    tab: 'wrap_screen',
    label: 'Latest sleep time',
    description: 'Set your waking and sleeping hours for time tracking.',
    keywords: ['sleep', 'night', 'end', 'time'],
    type: 'time',
    defaultValue: 1320
  },
  {
    id: 'recapDay',
    section: 'Recap',
    tab: 'recap_screen',
    label: 'Recap Day',
    description: 'Set the day of the week to do a weekly recap.',
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
    section: 'Clock Style',
    tab: 'do_screen',
    label: 'Clock Style',
    description: 'Choose between the Classic Stopwatch or the Guzey Clock.',
    keywords: ['stopwatch', 'timer', 'guzey', 'axleless', 'flowtime'],
    type: 'select',
    defaultValue: 'axleless',
    options: [
      { value: 'axleless', label: 'Axleless Stopwatch' },
      { value: 'flowtime', label: 'Flowtime' },
      { value: 'guzey', label: 'Guzey Clock' }
    ]
  },
  {
    id: 'allowStopwatchWithoutTask',
    section: 'Stopwatch Task Requirement',
    tab: 'do_screen',
    label: 'Allow stopwatch use without selecting task',
    description: 'Allow using the stopwatch without actively selecting a task first.',
    keywords: ['stopwatch', 'task', 'requirement', 'allow'],
    type: 'checkbox',
    defaultValue: false
  },
  {
    id: 'flowtimeBreakDivisor',
    section: 'Flowtime Break Divisor',
    tab: 'do_screen',
    label: 'Flowtime Break Divisor',
    description: 'How much break time you earn (e.g. 5 means 1 min break for every 5 mins of work).',
    keywords: ['flowtime', 'break', 'divisor', 'rest'],
    type: 'number',
    defaultValue: 5,
    min: 1
  },
  {
    id: 'exportData',
    section: 'Export Data',
    tab: 'sync',
    label: 'Export Data',
    description: 'Export all your local data as JSON.',
    keywords: ['export', 'backup', 'json', 'data'],
    type: 'action',
    action: 'exportData',
    beta: true
  },
  {
    id: 'importTasks',
    section: 'Bulk Import Tasks',
    tab: 'sync',
    label: 'Bulk Import Tasks',
    description: 'Paste in tasks separated by newlines. They will be added as new tasks to the top of your list.',
    keywords: ['import', 'bulk', 'tasks', 'add', 'text'],
    type: 'action',
    action: 'importTasks'
  },
  {
    id: 'restoreBackup',
    section: 'Restore from Backup',
    tab: 'sync',
    label: 'Restore from Backup',
    description: 'If your data got corrupted, restore it from today\'s automatic backup snapshot. This will reload the application.',
    keywords: ['restore', 'backup', 'snapshot', 'recover'],
    type: 'action',
    action: 'restoreBackup',
    danger: true
  },
  {
    id: 'clearAllData',
    section: 'Danger Zone',
    tab: 'sync',
    label: 'Clear All Data',
    description: 'Permanently delete all your tasks, settings, logs, and other data from both this device and the cloud. This cannot be undone.',
    keywords: ['delete', 'clear', 'wipe', 'reset', 'factory', 'all'],
    type: 'action',
    action: 'clearAllData',
    danger: true
  },
  {
    id: 'keybindingOpenSettings',
    section: 'Global',
    tab: 'keybindings',
    label: 'Open Settings',
    description: 'Navigate and control Taskroot quickly.',
    keywords: ['keyboard', 'shortcut', 'settings', 'open'],
    type: 'keybinding',
    defaultValue: 'Ctrl+,'
  },
  {
    id: 'keybindingRestoreApp',
    section: 'Mini Tracker',
    tab: 'keybindings',
    label: 'Restore App',
    description: 'Restore the main application window from the mini tracker.',
    keywords: ['keyboard', 'shortcut', 'restore', 'maximize', 'mini tracker'],
    type: 'keybinding',
    defaultValue: 'Ctrl+Alt+R'
  }
];

export const SETTINGS_TABS = [
  { id: 'general', label: 'Plan screen' },
  { id: 'do_screen', label: 'Do screen' },
  { id: 'wrap_screen', label: 'Wrap screen' },
  { id: 'recap_screen', label: 'Recap screen' },
  { id: 'sync', label: 'Sync and Backup' },
  { id: 'keybindings', label: 'Keybindings' }
];

export const DEFAULT_SETTINGS = SETTINGS_SCHEMA.reduce((acc, schema) => {
  if (schema.defaultValue !== undefined) {
    acc[schema.id] = schema.defaultValue;
  }
  return acc;
}, {} as any);
