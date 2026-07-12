import React, { useState, useEffect } from 'react';
import { api } from './api';
import { SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS, SAMPLE_TIPS, SAMPLE_NOTES } from './data';

// React hook: manages local state, localStorage, and delegates remote sync to the ApiService
function useStored(key: string, initial: any) {
  const [val, setVal] = useState(() => {
    try {
      const saved = localStorage.getItem(`taskroot_${key}`);
      return saved ? JSON.parse(saved) : initial;
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
      (serverVal) => {
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

  const setValWrapper = (newValOrUpdater: any) => {
    let result;
    if (typeof newValOrUpdater === 'function') {
      setVal((prev: any) => {
        result = newValOrUpdater(prev);
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
        return result;
      });
    } else {
      result = newValOrUpdater;
      setVal(result); // Optimistic update
      localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
    }
    
    // Delegate to API to handle remote cloud sync. 
    // Notice how clean this is! No `if (user)` checks needed here.
    api.saveStoreData(key, result);
  };

  return [val, setValWrapper, isLoaded];
}

// These are largely no-ops now since useStored handles everything
function load(key: string, fallback: any) { return fallback; }
function save(key: string, value: any) {}
function ensure(key: string, initial: any) {}
function seedDefaults() {}

export { load, save, useStored, ensure, seedDefaults };
