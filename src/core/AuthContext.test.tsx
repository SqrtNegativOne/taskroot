import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from './api';
import { onAuthStateChanged } from 'firebase/auth';

vi.mock('firebase/auth', () => {
  const authState = {
    currentUser: null as any,
    listeners: new Set<Function>()
  };
  return {
    __fakeAuth: authState,
    onAuthStateChanged: (auth: any, cb: Function) => {
      authState.listeners.add(cb);
      // Call immediately with current state
      cb(authState.currentUser);
      return () => authState.listeners.delete(cb);
    },
    signInWithPopup: async () => {
      const user = { uid: 'test-user-123' };
      authState.currentUser = user;
      authState.listeners.forEach(cb => cb(user));
    },
    signOut: async () => {
      authState.currentUser = null;
      authState.listeners.forEach(cb => cb(null));
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
  let firebaseAuthModule: any;

  beforeEach(async () => {
    firebaseAuthModule = await import('firebase/auth');
    firebaseAuthModule.__fakeAuth.currentUser = null;
    firebaseAuthModule.__fakeAuth.listeners.clear();
    (api as any).__fakeApi.userId = null;
  });

  afterEach(() => {
  });

  it('initially shows loading state', () => {
    // Prevent immediate resolution for this test
    const originalOnAuth = firebaseAuthModule.onAuthStateChanged;
    firebaseAuthModule.onAuthStateChanged = () => () => {};
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Restore
    firebaseAuthModule.onAuthStateChanged = originalOnAuth;
  });

  it('updates state and calls api.setUserId when user logs in', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await firebaseAuthModule.signInWithPopup();
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test-user-123');
    expect((api as any).__fakeApi.userId).toBe('test-user-123');
  });

  it('updates state and calls api.setUserId when user logs out', async () => {
    // Start logged in
    firebaseAuthModule.__fakeAuth.currentUser = { uid: 'test-user-123' };
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await firebaseAuthModule.signOut();
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    expect((api as any).__fakeApi.userId).toBeNull();
  });

  it('calls signOut when logout is triggered', async () => {
    firebaseAuthModule.__fakeAuth.currentUser = { uid: 'test-user-123' };
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(firebaseAuthModule.__fakeAuth.currentUser).toBeNull();
    expect((api as any).__fakeApi.userId).toBeNull();
  });
});
