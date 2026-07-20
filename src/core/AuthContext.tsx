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
import { useNotification } from './notifications';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      (currentUser) => {
        setUser(currentUser);
        api.setUserId(currentUser ? currentUser.uid : null);
        setLoading(false);
      },
      (error) => {
        console.error("Auth State Error:", error);
        notify(`Authentication error: ${error.message}`, 'error');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [notify]);

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
           scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
           ux_mode: 'popup',
           callback: async (response: any) => {
               if (response.code) {
                   try {
                       const res = await fetch('https://oauth2.googleapis.com/token', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                           client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
                           code: response.code,
                           grant_type: 'authorization_code',
                           redirect_uri: 'postmessage'
                         })
                       });
                       const data = await res.json();
                       if (data.access_token) {
                         localStorage.setItem('google_access_token', data.access_token);
                         if (data.refresh_token) {
                           localStorage.setItem('google_refresh_token', data.refresh_token);
                         }
                         window.location.reload(); // Reload to start sync
                       } else {
                         throw new Error(data.error_description || "Failed to exchange token");
                       }
                   } catch (err) {
                       console.error("Failed to exchange auth code:", err);
                       notify("Failed to exchange auth code for calendar sync", "error");
                   }
               }
           }
        });
        client.requestCode();
      };
      document.body.appendChild(script);

    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      notify(`Sign in failed: ${error.message}\nMake sure you have added your REAL Firebase config keys to a .env file!`, 'error');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('google_access_token');
    } catch (error: any) {
      console.error("Error signing out:", error);
      notify(`Logout failed: ${error.message}`, 'error');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
