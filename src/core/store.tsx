import React, { useState, useEffect } from 'react';
import { api } from './api';
import { syncEngine } from './SyncEngine';
import { SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS, SAMPLE_TIPS, SAMPLE_NOTES } from './data';

// React hook: manages local state, localStorage, and delegates remote sync to the ApiService
function useStored<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [val, setVal] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`taskroot_${key}`);
      if (saved) {
        // Save a daily snapshot backup
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`taskroot_backup_${key}_${today}`, saved);
        return JSON.parse(saved);
      }
      return initial;
    } catch (e) {
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
function load(key: string, fallback: any) { return fallback; }
function save(key: string, value: any) {}
function ensure(key: string, initial: any) {}
function seedDefaults() {}

export { load, save, useStored, ensure, seedDefaults };
