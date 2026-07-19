import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * ApiService centralizes all external database logic.
 * This completely removes 'if (user)' checks from our React components/hooks.
 */
class ApiService {
  private uid: string | null = null;

  // Called when auth state changes
  public setUserId(uid: string | null) {
    this.uid = uid;
  }

  public getUserId(): string | null {
    return this.uid;
  }

  // Wipes all data from localStorage and optionally Firestore
  public async clearAllData(): Promise<void> {
    const keysToRemove: string[] = [];
    const cloudKeysToDelete: string[] = [];
    
    // Identify all local keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('taskroot_')) {
        keysToRemove.push(key);
        // Only delete real store keys from cloud, ignore backups
        if (!key.startsWith('taskroot_backup_')) {
          cloudKeysToDelete.push(key.replace('taskroot_', ''));
        }
      }
    }
    
    // Wipe local storage
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // Wipe remote cloud data if signed in
    if (this.uid) {
      try {
        await Promise.all(
          cloudKeysToDelete.map(storeKey => 
            deleteDoc(doc(db, 'users', this.uid as string, 'store', storeKey))
          )
        );
      } catch (e) {
        console.warn('Failed to clear cloud data:', e);
      }
    }
  }

  // Saves data to remote cloud
  public async saveStoreData(key: string, data: any): Promise<void> {
    if (!this.uid) return; // Silent no-op for offline dev mode
    
    const docRef = doc(db, 'users', this.uid, 'store', key);
    try {
      await setDoc(docRef, { value: data }, { merge: true });
    } catch (e) {
      console.warn('Firestore write failed', e);
    }
  }

  // Subscribes to remote cloud updates
  public subscribeToStore(
    key: string, 
    fallbackData: any,
    onData: (serverVal: any) => void,
    onReady: () => void
  ): () => void {
    if (!this.uid) {
      // In offline/dev mode, there is no remote cloud, so we are instantly "ready".
      onReady();
      return () => {}; // No-op unsubscribe
    }

    const docRef = doc(db, 'users', this.uid, 'store', key);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data().value);
      } else {
        // If it doesn't exist in Firestore, seed it with fallbackData
        this.saveStoreData(key, fallbackData);
      }
      onReady();
    }, (err) => {
      console.warn(`Firestore sync failed for ${key}:`, err);
      onReady(); // Still ready if failed, so we don't block UI forever
    });
  }
}

export const api = new ApiService();
