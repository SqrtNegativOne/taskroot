import React, { useState, useEffect } from 'react';
import { SAMPLE_TASKS, SAMPLE_EVENTS, DEFAULT_STATUSES, DEFAULT_DISTRACTION_COLUMNS, SAMPLE_DISTRACTIONS, SAMPLE_TIPS, SAMPLE_NOTES } from './data';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// React hook: state synced to Firestore.
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
    const user = auth.currentUser;
    if (!user) return;
    
    const docRef = doc(db, 'users', user.uid, 'store', key);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const serverVal = docSnap.data().value;
        setVal(serverVal);
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(serverVal));
      } else {
        // If it doesn't exist in Firestore, seed it with current val
        setDoc(docRef, { value: val }, { merge: true });
      }
      setIsLoaded(true);
    }, (err) => {
      console.warn(`Firestore sync failed for ${key}:`, err);
      setIsLoaded(true); // Still consider it loaded if it fails so we don't block forever
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
        localStorage.setItem(`taskroot_${key}`, JSON.stringify(result));
        if (user) {
          setDoc(docRef, { value: result }, { merge: true }).catch(e => console.warn('Firestore write failed', e));
        }
        return result;
      });
    } else {
      setVal(newValOrUpdater); // Optimistic update
      localStorage.setItem(`taskroot_${key}`, JSON.stringify(newValOrUpdater));
      if (user) {
        setDoc(docRef, { value: newValOrUpdater }, { merge: true }).catch(e => console.warn('Firestore write failed', e));
      }
    }
  };

  return [val, setValWrapper, isLoaded];
}

// These are largely no-ops now since useStored handles everything via Firestore
function load(key: string, fallback: any) { return fallback; }
function save(key: string, value: any) {}
function ensure(key: string, initial: any) {}
function seedDefaults() {}

export { load, save, useStored, ensure, seedDefaults };
