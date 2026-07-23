import { describe, it, expect } from 'vitest';
import { SETTINGS_SCHEMA, SETTINGS_TABS, DEFAULT_SETTINGS } from './settingsSchema';

describe('settingsSchema.tsx', () => {
  it('should not have duplicate setting IDs', () => {
    const ids = SETTINGS_SCHEMA.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should compile DEFAULT_SETTINGS correctly from schema', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
    
    // Check a few known defaults
    expect(DEFAULT_SETTINGS.defaultCalendarView).toBe('month');
    expect(DEFAULT_SETTINGS.clockStyle).toBe('counter');
    expect(DEFAULT_SETTINGS.enableFirebaseSync).toBe(true);
  });

  it('all tabs used in schema must be defined in SETTINGS_TABS', () => {
    const definedTabs = new Set(SETTINGS_TABS.map(t => t.id));
    
    for (const setting of SETTINGS_SCHEMA) {
      if (setting.tab) {
        expect(definedTabs.has(setting.tab)).toBe(true);
      }
    }
  });

  it('should ensure bounded settings have valid min/max', () => {
    for (const setting of SETTINGS_SCHEMA) {
      if (setting.min !== undefined && setting.max !== undefined) {
        expect(setting.max).toBeGreaterThanOrEqual(setting.min);
      }
    }
  });
});
