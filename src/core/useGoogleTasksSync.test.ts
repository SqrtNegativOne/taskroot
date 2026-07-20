import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { toGoogleTask, toLocalTask, useGoogleTasksSync } from './useGoogleTasksSync';

describe('Google Tasks Sync Mappings', () => {
  it('maps a local task to a Google Task correctly', () => {
    const localTask = {
      id: 't1',
      title: 'Work on feature X',
      status: 'todo',
      notes: 'Some description',
      due: '2026-07-12'
    };

    const gTask = toGoogleTask(localTask);
    
    expect(gTask.title).toBe('Work on feature X');
    expect(gTask.status).toBe('needsAction');
    expect(gTask.notes).toContain('Taskroot Task ID: t1');
    expect(gTask.notes).toContain('Some description');
    expect(gTask.due).toContain('2026-07-12T00:00:00');
  });

  it('maps a completed local task to a Google Task correctly', () => {
    const localTask = {
      id: 't2',
      title: 'Finished feature',
      status: 'done'
    };

    const gTask = toGoogleTask(localTask);
    expect(gTask.status).toBe('completed');
  });

  it('maps a Google Task back to a local Task correctly with default fields', () => {
    const gTask = {
      id: 'gtask_123',
      title: 'New Remote Task',
      status: 'needsAction',
      notes: 'Remote notes',
      due: '2026-08-01T00:00:00Z'
    };

    const localTask = toLocalTask(gTask);
    expect(localTask.googleTaskId).toBe('gtask_123');
    expect(localTask.title).toBe('New Remote Task');
    expect(localTask.status).toBe('todo');
    expect(localTask.notes).toBe('Remote notes');
    expect(localTask.due).toBe('2026-08-01');
    expect(localTask.priority).toBe('P2'); // Default field
    expect(localTask.est).toBe(0); // Default field
  });

  it('merges a Google Task with an existing local task', () => {
    const existingLocalTask = {
      id: 't_existing',
      title: 'Old Title',
      status: 'todo',
      priority: 'P1',
      est: 60,
      notes: 'Local notes',
      due: '2026-07-15'
    };

    const gTask = {
      id: 'gtask_456',
      title: 'Updated Title',
      status: 'completed',
      notes: 'Updated notes',
      due: '2026-07-20T00:00:00Z'
    };

    const localTask = toLocalTask(gTask, existingLocalTask);
    expect(localTask.id).toBe('t_existing');
    expect(localTask.googleTaskId).toBe('gtask_456');
    expect(localTask.title).toBe('Updated Title');
    expect(localTask.status).toBe('done');
    expect(localTask.notes).toBe('Updated notes');
    expect(localTask.due).toBe('2026-07-20');
    expect(localTask.priority).toBe('P1'); // Preserved from local
    expect(localTask.est).toBe(60); // Preserved from local
  });
});

vi.mock('./notifications', () => ({
  useNotification: () => ({ notify: vi.fn() })
}));

describe('useGoogleTasksSync Integration via DI', () => {
  it('calls fetchTasks on mount and pushes un-synced local tasks', async () => {
    // 1. Setup Mock API Client
    const mockApiClient = {
      fetchTasks: vi.fn().mockResolvedValue({
        ok: true,
        items: [] // return empty tasks list
      }),
      createTask: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new_gtask_123' })
      }),
      updateTask: vi.fn().mockResolvedValue({ ok: true }),
      deleteTask: vi.fn().mockResolvedValue({ ok: true })
    };

    // 2. Setup initial state
    const initialTasks = [
      { id: 'local_1', title: 'Test Task', status: 'todo' }
    ];
    const setTasks = vi.fn();

    // Fake the localStorage token
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => 'fake_token');

    // 3. Render Hook with injected mockApiClient
    const { result } = renderHook(() => 
      useGoogleTasksSync(initialTasks, setTasks, mockApiClient)
    );

    // 4. Trigger initial sync manually to bypass setInterval
    await waitFor(() => {
      result.current.performInitialSync();
    });

    // 5. Verify the DI client was used
    expect(mockApiClient.fetchTasks).toHaveBeenCalled();
    expect(mockApiClient.createTask).toHaveBeenCalled();

    // The un-synced local task should have been pushed
    const createCallArgs = mockApiClient.createTask.mock.calls[0];
    expect(createCallArgs[0].title).toBe('Test Task'); // Body
    expect(createCallArgs[1]).toBe('fake_token'); // Token

    // Cleanup
    Storage.prototype.getItem = originalGetItem;
  });
});
