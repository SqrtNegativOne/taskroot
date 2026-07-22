import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type NotificationType = 'info' | 'error' | 'success';

interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
  exiting: boolean;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, exiting: false }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
    );
    
    // Remove from DOM after exit animation completes
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 600);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px',
          zIndex: 9999,
          pointerEvents: 'none', // Let clicks pass through to the app
        }}
      >
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function NotificationItem({ notification, onDismiss }: { notification: NotificationData, onDismiss: () => void }) {
  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'error': return { bg: 'rgba(220, 38, 38, 0.8)', border: 'rgba(248, 113, 113, 0.5)' };
      case 'success': return { bg: 'rgba(22, 163, 74, 0.8)', border: 'rgba(74, 222, 128, 0.5)' };
      default: return { bg: 'rgba(30, 41, 59, 0.8)', border: 'rgba(71, 85, 105, 0.5)' };
    }
  };

  const colors = getColors(notification.type);

  return (
    <div
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(notification.message);
          // Briefly flash the background to indicate successful copy
          const el = document.getElementById(`notif-${notification.id}`);
          if (el) {
            const oldBg = el.style.background;
            el.style.background = 'rgba(255, 255, 255, 0.2)';
            setTimeout(() => {
              el.style.background = oldBg;
            }, 150);
          }
        } catch (err) {
          console.error('Failed to copy notification:', err);
        }
      }}
      id={`notif-${notification.id}`}
      style={{
        background: colors.bg,
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: 500,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'auto', // Allow interacting with the notification if needed
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        animation: notification.exiting 
          ? 'notify-fade-out-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
          : 'notify-slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        maxWidth: '350px',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}
      title="Click to copy"
    >
      <span style={{ flex: 1 }}>{notification.message}</span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'currentColor',
          cursor: 'pointer',
          padding: '4px',
          opacity: 0.7,
          fontSize: '1.2rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }}
        title="Dismiss"
      >
        ×
      </button>
      <style>{`
        @keyframes notify-slide-in-right {
          from { opacity: 0; transform: translateX(50px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes notify-fade-out-up {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
