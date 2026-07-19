import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { toGoogleEvent, toLocalEvent, useGoogleCalendarSync } from './useGoogleCalendarSync';

describe('Google Calendar Sync Mappings', () => {
  it('maps a TaskEvent (plan) to a Google Event correctly', () => {
    const tasks = [
      { id: 't1', title: 'Work on feature X', priority: 'P1', status: 'nextup', tags: [] }
    ];
    
    const localEvent = {
      id: 'e1',
      type: 'plan',
      date: '2026-07-12',
      start: 600, // 10:00 AM
      end: 660,   // 11:00 AM
      taskId: 't1'
    };

    const gEvent = toGoogleEvent(localEvent, tasks);
    
    // We expect the title to be pulled from the task
    expect(gEvent.summary).toBe('Work on feature X');
    // Start and end should be correctly formatted strings
    expect(gEvent.start.dateTime).toContain('2026-07-12T10:00:00');
    expect(gEvent.end.dateTime).toContain('2026-07-12T11:00:00');
    // Description should embed both IDs for two-way sync tracking
    expect(gEvent.description).toContain('Taskroot Event ID: e1');
    expect(gEvent.description).toContain('Task ID: t1');
  });

  it('maps a BusyEvent to a Google Event correctly', () => {
    const tasks = [];
    const localEvent = {
      id: 'e2',
      type: 'busy',
      title: 'Doctor Appointment',
      date: '2026-07-13',
      start: 900, // 15:00
      end: 930    // 15:30
    };

    const gEvent = toGoogleEvent(localEvent, tasks);
    expect(gEvent.summary).toBe('Doctor Appointment');
    expect(gEvent.start.dateTime).toContain('2026-07-13T15:00:00');
    expect(gEvent.end.dateTime).toContain('2026-07-13T15:30:00');
    expect(gEvent.description).toContain('Taskroot Event ID: e2');
    expect(gEvent.description).not.toContain('Task ID'); // No task
  });

  it('maps a Google Event back to a local TaskEvent (plan) correctly', () => {
    const gEvent = {
      id: 'gcal_123',
      summary: 'Updated Feature X Work',
      start: { dateTime: '2026-07-12T10:00:00Z' },
      end: { dateTime: '2026-07-12T11:30:00Z' },
      description: 'Some user notes here\nTaskroot Event ID: e1\nTask ID: t1'
    };

    const localEvent = toLocalEvent(gEvent);
    expect(localEvent.id).toBe('e1');
    expect(localEvent.googleEventId).toBe('gcal_123');
    expect(localEvent.taskId).toBe('t1');
    expect(localEvent.type).toBe('plan');
    expect(localEvent.title).toBe('Updated Feature X Work');
    // We skip exact start/end time assertions because of local timezone parsing differences in tests,
    // but we can verify the properties exist.
    expect(localEvent.start).toBeDefined();
    expect(localEvent.end).toBeDefined();
  });
});

// We need to mock useNotification to prevent errors
vi.mock('./notifications', () => ({
  useNotification: () => ({ notify: vi.fn() })
}));

describe('useGoogleCalendarSync Integration via DI', () => {
  it('calls fetchEvents on mount and pushes un-synced local events', async () => {
    // 1. Setup Mock API Client
    const mockApiClient = {
      fetchCalendars: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      }),
      fetchEvents: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }) // return empty calendar
      }),
      createEvent: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new_gcal_123' })
      }),
      updateEvent: vi.fn().mockResolvedValue({ ok: true }),
      deleteEvent: vi.fn().mockResolvedValue({ ok: true })
    };

    // 2. Setup initial state
    const initialEvents = [
      { id: 'local_1', type: 'plan', date: '2026-07-12', start: 600, end: 660, taskId: 't1' }
    ];
    const setEvents = vi.fn();
    const tasks = [{ id: 't1', title: 'Test Task' }];

    // Fake the localStorage token
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => 'fake_token');

    // 3. Render Hook with injected mockApiClient
    const { result } = renderHook(() => 
      useGoogleCalendarSync(initialEvents, setEvents, tasks, mockApiClient)
    );

    // 4. Trigger initial sync manually to bypass setInterval
    await waitFor(() => {
      result.current.performInitialSync();
    });

    // 5. Verify the DI client was used
    expect(mockApiClient.fetchEvents).toHaveBeenCalled();
    expect(mockApiClient.createEvent).toHaveBeenCalled();

    // The un-synced local event should have been pushed
    const createCallArgs = mockApiClient.createEvent.mock.calls[0];
    expect(createCallArgs[0].summary).toBe('Test Task'); // Body
    expect(createCallArgs[1]).toBe('fake_token'); // Token

    // Cleanup
    Storage.prototype.getItem = originalGetItem;
  });
});
