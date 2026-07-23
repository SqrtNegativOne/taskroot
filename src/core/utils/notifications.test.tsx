import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { NotificationProvider, useNotification } from './notifications';

// A test component to trigger notifications
const TestComponent = ({ message, type }: { message: string, type?: 'info' | 'error' | 'success' }) => {
  const { notify } = useNotification();
  
  return (
    <button onClick={() => notify(message, type)}>
      Trigger Notification
    </button>
  );
};

// Component to trigger notification on mount for easier testing
const AutoTriggerComponent = ({ message, type }: { message: string, type?: 'info' | 'error' | 'success' }) => {
  const { notify } = useNotification();
  
  useEffect(() => {
    notify(message, type);
  }, [notify, message, type]);
  
  return null;
};

describe('Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a notification when notify is called', () => {
    render(
      <NotificationProvider>
        <TestComponent message="Test notification message" />
      </NotificationProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Trigger Notification'));
    });

    const notification = screen.getByText('Test notification message');
    expect(notification).toBeInTheDocument();
  });



  it('renders multiple notifications', () => {
    render(
      <NotificationProvider>
        <div>
          <TestComponent message="Message 1" />
          <TestComponent message="Message 2" />
        </div>
      </NotificationProvider>
    );

    act(() => {
      const buttons = screen.getAllByText('Trigger Notification');
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);
    });

    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });
});
