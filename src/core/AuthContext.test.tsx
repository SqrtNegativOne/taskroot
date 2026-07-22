import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from './api';
import { onAuthStateChanged } from 'firebase/auth';

const fakeAuthState = {
  currentUser: null as any,
  listeners: new Set<Function>(),
  onAuthStateChanged: (auth: any, cb: Function) => {
    fakeAuthState.listeners.add(cb);
    // Call immediately with current state
    cb(fakeAuthState.currentUser);
    return () => fakeAuthState.listeners.delete(cb);
  }
};

vi.mock('firebase/auth', () => {
  return {
    onAuthStateChanged: (auth: any, cb: Function) => fakeAuthState.onAuthStateChanged(auth, cb),
    onAuthStateChanged: (auth: any, cb: Function) => fakeAuthState.onAuthStateChanged(auth, cb),
    signInWithPopup: async () => {
      const user = { uid: 'test-user-123' };
      fakeAuthState.currentUser = user;
      fakeAuthState.listeners.forEach(cb => cb(user));
    },
    signOut: async () => {
      fakeAuthState.currentUser = null;
      fakeAuthState.listeners.forEach(cb => cb(null));
    },
    GoogleAuthProvider: class {}
  };
});

vi.mock('./firebase', () => ({
  auth: {},
  googleProvider: {}
}));

vi.mock('./api', () => {
  const apiState = {
    userId: null as string | null
  };
  return {
    api: {
      __fakeApi: apiState,
      setUserId: (id: string | null) => {
        apiState.userId = id;
      }
    }
  };
});

vi.mock('./notifications', () => ({
  useNotification: () => ({
    notify: () => {}
  })
}));

const TestComponent = () => {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <div data-testid="user-status">{user ? `Logged in as ${user.uid}` : 'Not logged in'}</div>
      <button onClick={loginWithGoogle}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(async () => {
    fakeAuthState.currentUser = null;
    fakeAuthState.listeners.clear();
    fakeAuthState.onAuthStateChanged = (auth: any, cb: Function) => {
      fakeAuthState.listeners.add(cb);
      cb(fakeAuthState.currentUser);
      return () => fakeAuthState.listeners.delete(cb);
    };
    (api as any).__fakeApi.userId = null;
  });

  afterEach(() => {
  });

  it('initially shows loading state', async () => {
    // Prevent immediate resolution for this test
    const originalOnAuth = fakeAuthState.onAuthStateChanged;
    fakeAuthState.onAuthStateChanged = () => () => {};
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Restore
    fakeAuthState.onAuthStateChanged = originalOnAuth;
  });

  it('updates state and calls api.setUserId when user logs in', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      const firebaseAuthModule = await import('firebase/auth');
      await firebaseAuthModule.signInWithPopup({} as any, {} as any);
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test-user-123');
    expect((api as any).__fakeApi.userId).toBe('test-user-123');
  });

  it('updates state and calls api.setUserId when user logs out', async () => {
    // Start logged in
    fakeAuthState.currentUser = { uid: 'test-user-123' };
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      const firebaseAuthModule = await import('firebase/auth');
      await firebaseAuthModule.signOut({} as any);
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    expect((api as any).__fakeApi.userId).toBeUndefined();
  });

  it('calls signOut when logout is triggered', async () => {
    fakeAuthState.currentUser = { uid: 'test-user-123' };
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(fakeAuthState.currentUser).toBeNull();
    expect((api as any).__fakeApi.userId).toBeUndefined();
  });
});
