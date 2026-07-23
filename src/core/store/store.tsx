import React, { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { api } from './api';
import { syncEngine } from '../sync/SyncEngine';
import { SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS, SAMPLE_TIPS, SAMPLE_NOTES } from './data';
import { SETTINGS_SCHEMA, DEFAULT_SETTINGS } from './settingsSchema';
import type { AppSettings } from './settingsSchema';

export const VALID_STORE_KEYS = [
  'settings', 'tasks', 'events', 'distractions', 'distractionStatuses', 
  'distractionColumns', 'stopwatch', 'time_logs', 'tips', 'notes', 
  'taskQuery', 'taskFilters', 'taskSort', 'restItems', 'test_key', 
  'calFilters', 'calSort', 'timeFilters', 'timeSort', 'calendars'
] as const;

export type StoreKey = typeof VALID_STORE_KEYS[number];

export function purgeOrphanedData(notify?: (msg: string, type: 'error') => void) {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('taskroot_')) continue;

    const rawKey = key.replace('taskroot_', '');
    if (!VALID_STORE_KEYS.includes(rawKey as any)) {
      keysToRemove.push(key);
    }
  }
  if (keysToRemove.length > 0) {
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (notify) {
      notify(`Removed ${keysToRemove.length} orphaned store item(s).`, 'error');
    }
  }
}

let globalSettings: AppSettings | null = null;
const settingsListeners = new Set<() => void>();

export function useSetting<K extends keyof AppSettings>(settingKey: K): [AppSettings[K], (val: AppSettings[K]) => void] {
    if (!globalSettings) {
        try {
            const raw = localStorage.getItem('taskroot_settings');
            globalSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        } catch (e) {
            globalSettings = { ...DEFAULT_SETTINGS };
        }
    }
    
    const value = useSyncExternalStore(
        (listener) => {
            settingsListeners.add(listener);
            return () => settingsListeners.delete(listener);
        },
        () => globalSettings![settingKey]
    );

    const [, setSettings] = useStored<AppSettings>('settings', DEFAULT_SETTINGS as AppSettings);

    const setter = useCallback((newVal: AppSettings[K]) => {
        globalSettings = { ...globalSettings!, [settingKey]: newVal };
        settingsListeners.forEach(l => l());
        setSettings(globalSettings);
    }, [settingKey, setSettings]);

    useEffect(() => {
        syncEngine.registerUpdater('settings', (serverVal: any) => {
            globalSettings = serverVal;
            settingsListeners.forEach(l => l());
        });
    }, []);

    return [value, setter];
}

// React hook: manages local state, localStorage, and delegates remote sync to the ApiService
export function useStored<T>(key: StoreKey, initial: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [val, setVal] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`taskroot_${key}`);
      let parsed = saved ? JSON.parse(saved) : initial;
      if (key === 'settings') {
        const result: any = { ...DEFAULT_SETTINGS };
        if (parsed && typeof parsed === 'object') {
          for (const s of SETTINGS_SCHEMA) {
            if (!(s.id in parsed)) continue;

            let val = parsed[s.id];
            if (s.type === 'number') {
               val = Number(val);
               if (s.min !== undefined && val < s.min) val = s.min;
               if (s.max !== undefined && val > s.max) val = s.max;
            } else if (s.type === 'checkbox') {
               val = Boolean(val);
            }
            result[s.id as keyof AppSettings] = val as any;
          }
        }
        return result as unknown as T;
      }
      return parsed;
    } catch (e) {
      if (key === 'settings') return { ...DEFAULT_SETTINGS } as unknown as T;
      return initial;
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Register the setter with SyncEngine so it can push updates from the cloud to React
    syncEngine.registerUpdater(key, (serverVal: T) => {
      setVal(serverVal);
    });
  }, [key]);

  useEffect(() => {
    // Notify SyncEngine that this store is ready to receive data, 
    // SyncEngine will fetch initial data if needed.
    syncEngine.registerUpdater(key, (serverVal: T) => {
      setVal(serverVal);
      localStorage.setItem(`taskroot_${key}`, JSON.stringify(serverVal));
    });
    
    // Optimistically set loaded
    setIsLoaded(true);

    try {
      const settingsStr = localStorage.getItem('taskroot_settings');
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        if (parsed.enableFirebaseSync === false) {
          return () => {};
        }
      }
    } catch(e) {}

    const unsubscribe = api.subscribeToStore(
      key, 
      val, // fallback/seed data if cloud document doesn't exist yet
      (serverVal: T) => {
        setVal(serverVal);
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(serverVal));
      },
      () => {
        // Called when subscription is ready or failed, or instantly if offline
        setIsLoaded(true);
      }
    );
    
    return unsubscribe;
  }, [key]);

  const setValWrapper = (newValOrUpdater: T | ((prev: T) => T)) => {
    let result: T;
    if (typeof newValOrUpdater === 'function') {
      setVal((prev: T) => {
        const updater = newValOrUpdater as ((prev: T) => T);
        result = updater(prev);
        
        // Auto-inject updatedAt
        if (Array.isArray(result) && Array.isArray(prev)) {
          let mutated = false;
          const mapped = result.map(newItem => {
            if (newItem && newItem.id) {
               const oldItem = prev.find(o => o.id === newItem.id);
               // Simple shallow comparison (excluding updatedAt)
               const { updatedAt: _o, ...oldRest } = oldItem || {};
               const { updatedAt: _n, ...newRest } = newItem;
               if (!oldItem || JSON.stringify(oldRest) !== JSON.stringify(newRest)) {
                 mutated = true;
                 return { ...newItem, updatedAt: Date.now() };
               }
            }
            return newItem;
          });
          if (mutated) result = mapped as unknown as T;
        }
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
        
        let enableFirebase = true;
        try {
          const settingsStr = localStorage.getItem('taskroot_settings');
          if (settingsStr) enableFirebase = JSON.parse(settingsStr).enableFirebaseSync !== false;
        } catch(e) {}
        
        if (enableFirebase) {
          api.saveStoreData(key, result);
        }
        
        // Notify SyncEngine of the delta and let it handle remote sync
        if (Array.isArray(result)) {
           syncEngine.notifyDataChanged(key, result);
        }

        return result;
      });
    } else {
      result = newValOrUpdater;
      
      // Auto-inject updatedAt (if we have access to prev state, but since we don't easily, we just update all without updatedAt or assume they are fresh)
      if (Array.isArray(result)) {
         result = result.map((newItem: any) => {
            if (newItem && newItem.id && !newItem.updatedAt) {
               return { ...newItem, updatedAt: Date.now() };
            }
            return newItem;
         }) as unknown as T;
      }
      
      setVal(result); // Optimistic update
      localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
      
      let enableFirebase = true;
      try {
        const settingsStr = localStorage.getItem('taskroot_settings');
        if (settingsStr) enableFirebase = JSON.parse(settingsStr).enableFirebaseSync !== false;
      } catch(e) {}
      
      if (enableFirebase) {
        api.saveStoreData(key, result);
      }

      // Notify SyncEngine of the delta and let it handle remote sync
      if (Array.isArray(result)) {
         syncEngine.notifyDataChanged(key, result);
      }
    }
  };

  return [val, setValWrapper, isLoaded];
}

// These are largely no-ops now since useStored handles everything
export function load(key: string, fallback: any) { return fallback; }
export function save(key: string, value: any) {}
export function ensure(key: string, initial: any) {}
export function seedDefaults() {}


