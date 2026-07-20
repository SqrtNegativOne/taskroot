import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { api } from './api';

// Mock dependencies
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {}
}));

vi.mock('./firebase', () => ({
  auth: {},
  googleProvider: {}
}));

vi.mock('./api', () => ({
  api: {
    setUserId: vi.fn()
  }
}));

vi.mock('./notifications', () => ({
  useNotification: () => ({
    notify: vi.fn()
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initially shows loading state and calls onAuthStateChanged', () => {
    (onAuthStateChanged as any).mockImplementation(() => () => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  it('updates state and calls api.setUserId when user logs in', async () => {
    let capturedCallback: Function = () => {};
    
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: Function) => {
      capturedCallback = callback;
      return () => {};
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      capturedCallback({ uid: 'test-user-123' });
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test-user-123');
    expect(api.setUserId).toHaveBeenCalledWith('test-user-123');
  });

  it('updates state and calls api.setUserId when user logs out', async () => {
    let capturedCallback: Function = () => {};
    
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: Function) => {
      capturedCallback = callback;
      return () => {};
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      capturedCallback(null);
    });

    expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    expect(api.setUserId).toHaveBeenCalledWith(null);
  });

  it('calls signOut when logout is triggered', async () => {
    let capturedCallback: Function = () => {};
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: Function) => {
      capturedCallback = callback;
      return () => {};
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      capturedCallback({ uid: 'test-user' });
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
