import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/AuthContext';

// We'll import these once the subagent finishes porting them
import { PlanView } from './features/plan/PlanView';
import { DoView } from './features/do/DoView';
import { RestView } from './features/rest/RestView';
import { TopBar } from './components/shell';
import { useStored } from './core/store';
import { SAMPLE_TASKS, SAMPLE_EVENTS } from './core/data';
import { useGoogleCalendarSync } from './core/useGoogleCalendarSync';
import { NotificationProvider, useNotification } from './core/notifications';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { notify } = useNotification();
  const notified = React.useRef(false);
  
  if (import.meta.env.DEV) {
    if (!notified.current) {
      notified.current = true;
      // Use setTimeout to ensure it doesn't fire during render
      setTimeout(() => notify("Dev mode: Bypassed login & offline mode enabled", "info"), 500);
    }
    return <>{children}</>;
  }

  if (loading) return <div>Loading...</div>;
  if (!user) {
    return <LoginView />;
  }
  return <>{children}</>;
}

function LoginView() {
  const { loginWithGoogle } = useAuth();
  
  return (
    <div style={{
      display: 'flex', 
      height: '100vh', 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column',
      background: 'radial-gradient(circle at top, var(--bg-surface-hover) 0%, var(--bg) 60%)',
      color: 'var(--fg)',
      fontFamily: 'var(--sans)'
    }}>
      <div style={{
        background: 'rgba(24, 20, 16, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '3.5rem 4.5rem',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px inset rgba(255,255,255,0.03)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        animation: 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '3rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, var(--fg) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Taskroot</h1>
          <p style={{
            margin: 0,
            color: 'var(--fg-muted)',
            fontSize: '1.15rem',
            fontWeight: 400
          }}>Focus on what matters.</p>
        </div>
        
        <button 
          onClick={loginWithGoogle} 
          style={{ 
            marginTop: '0.5rem',
            padding: '0.9rem 2rem', 
            fontSize: '1.05rem', 
            fontWeight: 500,
            cursor: 'pointer',
            background: 'var(--bg-surface)',
            color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-btn-hover)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'var(--accent-line)';
            e.currentTarget.style.background = 'var(--bg-surface-hover)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.boxShadow = 'var(--shadow-btn-hover)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-btn)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
