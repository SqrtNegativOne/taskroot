import React, { useState, useEffect } from 'react';
import { api } from './api';
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
    // The api handles all the database logic (including checking if the user is logged in).
    // We just provide it callbacks for when data arrives from the cloud.
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
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
        
        // Delegate to API to handle remote cloud sync.
        api.saveStoreData(key, result);
        return result;
      });
    } else {
      result = newValOrUpdater;
      setVal(result); // Optimistic update
      localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
      
      // Delegate to API to handle remote cloud sync.
      api.saveStoreData(key, result);
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
