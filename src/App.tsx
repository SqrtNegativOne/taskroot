import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

// We'll import these once the subagent finishes porting them
import { PlanView } from './PlanView';
import { DoView } from './DoView';
import { RestView } from './RestView';
import { TopBar } from './shell';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) {
    return <LoginView />;
  }
  return children;
}

function LoginView() {
  const { loginWithGoogle } = useAuth();
  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <h1>Taskroot</h1>
      <p>Log in to sync your tasks</p>
      <button onClick={loginWithGoogle} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
        Sign in with Google
      </button>
    </div>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/plan" element={<PlanView />} />
      <Route path="/do" element={<DoView />} />
      <Route path="/rest" element={<RestView />} />
      <Route path="*" element={<Navigate to="/plan" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <AppRouter />
      </RequireAuth>
    </AuthProvider>
  );
}
