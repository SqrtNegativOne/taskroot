import React, { useState, useEffect } from 'react';
import { SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS, SAMPLE_TIPS, SAMPLE_NOTES } from './data';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// React hook: state synced to Firestore.
function useStored(key: string, initial: any) {
  const [val, setVal] = useState(initial);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    const docRef = doc(db, 'users', user.uid, 'store', key);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setVal(docSnap.data().value);
      } else {
        // If it doesn't exist in Firestore, seed it with initial
        setDoc(docRef, { value: initial }, { merge: true });
        setVal(initial);
      }
    });
    return unsubscribe;
  }, [key]); // removed initial from deps to avoid infinite loops if initial is an object

  const setValWrapper = (newValOrUpdater: any) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const docRef = doc(db, 'users', user.uid, 'store', key);
    if (typeof newValOrUpdater === 'function') {
      setVal((prev: any) => {
        const result = newValOrUpdater(prev);
        setDoc(docRef, { value: result }, { merge: true });
        return result;
      });
    } else {
      setVal(newValOrUpdater); // Optimistic update
      setDoc(docRef, { value: newValOrUpdater }, { merge: true });
    }
  };

  return [val, setValWrapper];
}

// These are largely no-ops now since useStored handles everything via Firestore
function load(key: string, fallback: any) { return fallback; }
function save(key: string, value: any) {}
function ensure(key: string, initial: any) {}
function seedDefaults() {}

export { load, save, useStored, ensure, seedDefaults };
