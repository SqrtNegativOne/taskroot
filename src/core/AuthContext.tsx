import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { GoogleAuthProvider } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

import { api } from './api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      api.setUserId(currentUser ? currentUser.uid : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // 1. Sign into Firebase for database access
      await signInWithPopup(auth, googleProvider);
      
      // 2. Load Google Identity Services to get the offline auth code for Calendar sync
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        const client = (window as any).google.accounts.oauth2.initCodeClient({
           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
           scope: 'https://www.googleapis.com/auth/calendar',
           ux_mode: 'popup',
           callback: async (response: any) => {
               if (response.code) {
                   try {
                       const { getFunctions, httpsCallable } = await import('firebase/functions');
                       const functions = getFunctions();
                       const exchangeAuthCode = httpsCallable(functions, 'exchangeAuthCode');
                       const res = await exchangeAuthCode({ code: response.code });
                       const newAccessToken = (res.data as any).accessToken;
                       if (newAccessToken) {
                         localStorage.setItem('google_access_token', newAccessToken);
                       }
                   } catch (err) {
                       console.error("Failed to exchange auth code:", err);
                   }
               }
           }
        });
        client.requestCode();
      };
      document.body.appendChild(script);

    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      alert(`Sign in failed: ${error.message}\n\nMake sure you have added your REAL Firebase config keys to a .env file!`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('google_access_token');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
