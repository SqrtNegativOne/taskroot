import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/AuthContext';

import { PlanScreen } from './features/plan/PlanScreen';
import { DoScreen } from './features/do/DoScreen';
import { RestScreen } from './features/rest/RestScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TitleBar } from './components/shell';
import { useStored } from './core/store';
import { SAMPLE_TASKS, SAMPLE_EVENTS } from './core/data';
import { useGoogleCalendarSync } from './core/useGoogleCalendarSync';
import { NotificationProvider, useNotification } from './core/notifications';
import { LoginScreen } from './features/login/LoginScreen';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { notify } = useNotification();
  const notified = React.useRef(false);
  
  if (import.meta.env.VITE_OFFLINE_MODE === 'true') {
    if (!notified.current) {
      notified.current = true;
      // Use setTimeout to ensure it doesn't fire during render
      setTimeout(() => notify("Offline mode: Bypassed login", "info"), 500);
    }
    return <>{children}</>;
  }

  if (loading) return <div>Loading...</div>;
  if (!user) {
    return <LoginScreen />;
  }
  return <>{children}</>;
}



function AppRouter() {
  return (
    <Routes>
      <Route path="/plan" element={<PlanScreen />} />
      <Route path="/do" element={<DoScreen />} />
      <Route path="/rest" element={<RestScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/plan" replace />} />
    </Routes>
  );
}

function GlobalSync({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks, tasksLoaded] = useStored('tasks', SAMPLE_TASKS);
  const [events, setEvents, eventsLoaded] = useStored('events', SAMPLE_EVENTS);
  useGoogleCalendarSync(events, setEvents, tasks);

  if (!tasksLoaded || !eventsLoaded) {
    return (
      <div style={{
        display: 'flex', 
        height: '100vh', 
        justifyContent: 'center', 
        alignItems: 'center', 
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <RequireAuth>
          <GlobalSync>
            <AppRouter />
          </GlobalSync>
        </RequireAuth>
      </AuthProvider>
    </NotificationProvider>
  );
}
