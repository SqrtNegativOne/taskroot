import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface IApiService {
  clearAllData(): Promise<void>;
  saveStoreData(key: string, data: any): Promise<void>;
  subscribeToStore(
    key: string, 
    fallbackData: any,
    onData: (serverVal: any) => void,
    onReady: () => void
  ): () => void;
}

class OfflineApi implements IApiService {
  public async clearAllData(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('taskroot_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  public async saveStoreData(key: string, data: any): Promise<void> {
    // Silent no-op for offline dev mode
  }

  public subscribeToStore(
    key: string, 
    fallbackData: any,
    onData: (serverVal: any) => void,
    onReady: () => void
  ): () => void {
    // In offline/dev mode, there is no remote cloud, so we are instantly "ready".
    onReady();
    return () => {}; // No-op unsubscribe
  }
}

class OnlineApi implements IApiService {
  private uid: string;
  constructor(uid: string) {
    this.uid = uid;
  }

  public async clearAllData(): Promise<void> {
    const keysToRemove: string[] = [];
    const cloudKeysToDelete: string[] = [];
    
    // Identify all local keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('taskroot_')) {
        keysToRemove.push(key);
        cloudKeysToDelete.push(key.replace('taskroot_', ''));
      }
    }
    
    // Wipe local storage
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // Wipe remote cloud data
    try {
      await Promise.all(
        cloudKeysToDelete.map(storeKey => 
          deleteDoc(doc(db, 'users', this.uid, 'store', storeKey))
        )
      );
    } catch (e) {
      console.warn('Failed to clear cloud data:', e);
    }
  }

  public async saveStoreData(key: string, data: any): Promise<void> {
    const docRef = doc(db, 'users', this.uid, 'store', key);
    try {
      await setDoc(docRef, { value: data }, { merge: true });
    } catch (e) {
      console.warn('Firestore write failed', e);
    }
  }

  public subscribeToStore(
    key: string, 
    fallbackData: any,
    onData: (serverVal: any) => void,
    onReady: () => void
  ): () => void {
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

class ApiFacade implements IApiService {
  private strategy: IApiService = new OfflineApi();
  private currentUid: string | undefined = undefined;

  // Called when auth state changes
  public setUserId(uid?: string) {
    this.currentUid = uid;
    if (uid) {
      this.strategy = new OnlineApi(uid);
    } else {
      this.strategy = new OfflineApi();
    }
  }

  public getUserId(): string | undefined {
    return this.currentUid;
  }

  public async clearAllData(): Promise<void> {
    return this.strategy.clearAllData();
  }

  public async saveStoreData(key: string, data: any): Promise<void> {
    return this.strategy.saveStoreData(key, data);
  }

  public subscribeToStore(
    key: string, 
    fallbackData: any,
    onData: (serverVal: any) => void,
    onReady: () => void
  ): () => void {
    return this.strategy.subscribeToStore(key, fallbackData, onData, onReady);
  }
}

export const api = new ApiFacade();
