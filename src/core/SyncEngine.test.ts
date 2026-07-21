import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from './SyncEngine';
import { googleCalendarAPI } from './GoogleCalendarAPI';
import { googleTasksAPI } from './GoogleTasksAPI';

vi.mock('./GoogleCalendarAPI', () => ({
  googleCalendarAPI: {
    setToken: vi.fn(),
    fetchEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    toGoogleEvent: vi.fn(),
    toLocalEvent: vi.fn(),
  }
}));

vi.mock('./GoogleTasksAPI', () => ({
  googleTasksAPI: {
    setToken: vi.fn(),
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    toGoogleTask: vi.fn(),
    toLocalTask: vi.fn(),
  }
}));

describe('SyncEngine', () => {
  let engine: SyncEngine;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    engine = new SyncEngine();
    // Stop intervals
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls tasks and resolves conflicts by taking the latest updatedAt', async () => {
    // Setup local task
    const localTasks = [
      { id: 't1', title: 'Local Task', updatedAt: 1000 }
    ];
    localStorage.setItem('taskroot_tasks', JSON.stringify(localTasks));
    
    // Setup remote task (newer)
    const remoteTask = { id: 'g1', title: 'Remote Task', updated: new Date(2000).toISOString() };
    (googleTasksAPI.fetchTasks as any).mockResolvedValue([remoteTask]);
    
    (googleTasksAPI.toLocalTask as any).mockReturnValue({
      id: 't1', title: 'Remote Task', updatedAt: 2000
    });
    
    await engine.poll();
    
    const saved = JSON.parse(localStorage.getItem('taskroot_tasks') || '[]');
    expect(saved[0].title).toBe('Remote Task');
    expect(saved[0].updatedAt).toBe(2000);
  });
  
  it('queues updates when local data changes', async () => {
    const initialTasks = [
      { id: 't1', title: 'Task 1', updatedAt: 1000, googleTaskId: 'g1' }
    ];
    engine.notifyDataChanged('tasks', initialTasks);
    
    // Simulate user editing task
    const updatedTasks = [
      { id: 't1', title: 'Task 1 Edited', updatedAt: 2000, googleTaskId: 'g1' }
    ];
    engine.notifyDataChanged('tasks', updatedTasks);
    
    // Processing queue should call updateTask
    (googleTasksAPI.updateTask as any).mockResolvedValue(true);
    
    await (engine as any).processPushQueue();
    expect(googleTasksAPI.updateTask).toHaveBeenCalledWith('g1', updatedTasks[0]);
  });
  
  it('queues creates when local data is new', async () => {
    engine.notifyDataChanged('tasks', []);
    
    const newTasks = [
      { id: 't2', title: 'New Task', updatedAt: 1000 }
    ];
    localStorage.setItem('taskroot_tasks', JSON.stringify(newTasks));
    engine.notifyDataChanged('tasks', newTasks);
    
    (googleTasksAPI.createTask as any).mockResolvedValue('g2');
    
    await (engine as any).processPushQueue();
    expect(googleTasksAPI.createTask).toHaveBeenCalledWith(newTasks[0]);
    
    // Ensure it updates localStorage with the new googleTaskId
    const saved = JSON.parse(localStorage.getItem('taskroot_tasks') || '[]');
    expect(saved[0].googleTaskId).toBe('g2');
  });
});
