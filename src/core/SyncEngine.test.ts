import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from './SyncEngine';
import { googleCalendarAPI } from './GoogleCalendarAPI';
import { googleTasksAPI } from './GoogleTasksAPI';

vi.mock('./GoogleCalendarAPI', () => {
  const fakeEvents = new Map();
  return {
    googleCalendarAPI: {
      fakeEvents, // Expose for testing
      setToken: () => {},
      fetchEvents: async () => Array.from(fakeEvents.values()),
      createEvent: async (e: any) => { 
        const id = 'e' + Date.now(); 
        fakeEvents.set(id, { ...e, id }); 
        return { id, calendarId: 'primary' }; 
      },
      updateEvent: async (id: string, e: any) => { 
        fakeEvents.set(id, { ...fakeEvents.get(id), ...e }); 
        return true; 
      },
      deleteEvent: async (id: string) => { 
        fakeEvents.delete(id); 
        return true; 
      },
      toGoogleEvent: (e: any) => e,
      toLocalEvent: (e: any) => e,
    }
  };
});

vi.mock('./GoogleTasksAPI', () => {
  const fakeTasks = new Map();
  return {
    googleTasksAPI: {
      fakeTasks, // Expose for testing
      setToken: () => {},
      fetchTasks: async () => Array.from(fakeTasks.values()),
      createTask: async (t: any) => { 
        const id = 'g' + Date.now(); 
        fakeTasks.set(id, { ...t, id }); 
        return id; 
      },
      updateTask: async (id: string, t: any) => { 
        fakeTasks.set(id, { ...fakeTasks.get(id), ...t }); 
        return true; 
      },
      deleteTask: async (id: string) => { 
        fakeTasks.delete(id); 
        return true; 
      },
      toGoogleTask: (t: any) => t,
      toLocalTask: (remote: any, existing: any) => ({
         id: existing ? existing.id : 't' + Date.now(),
         title: remote.title,
         updatedAt: new Date(remote.updated).getTime(),
         googleTaskId: remote.id
      }),
    }
  };
});

describe('SyncEngine', () => {
  let engine: SyncEngine;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (googleTasksAPI as any).fakeTasks.clear();
    (googleCalendarAPI as any).fakeEvents.clear();
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
    (googleTasksAPI as any).fakeTasks.set('g1', { 
      id: 'g1', 
      title: 'Remote Task', 
      updated: new Date(2000).toISOString(), 
      notes: 'Taskroot Task ID: t1' 
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
    
    (googleTasksAPI as any).fakeTasks.set('g1', { id: 'g1', title: 'Task 1' });
    
    // Simulate user editing task
    const updatedTasks = [
      { id: 't1', title: 'Task 1 Edited', updatedAt: 2000, googleTaskId: 'g1' }
    ];
    engine.notifyDataChanged('tasks', updatedTasks);
    
    await (engine as any).processPushQueue();
    
    expect((googleTasksAPI as any).fakeTasks.get('g1').title).toBe('Task 1 Edited');
  });
  
  it('queues creates when local data is new', async () => {
    engine.notifyDataChanged('tasks', []);
    
    const newTasks = [
      { id: 't2', title: 'New Task', updatedAt: 1000 }
    ];
    localStorage.setItem('taskroot_tasks', JSON.stringify(newTasks));
    engine.notifyDataChanged('tasks', newTasks);
    
    await (engine as any).processPushQueue();
    
    const saved = JSON.parse(localStorage.getItem('taskroot_tasks') || '[]');
    expect(saved[0].googleTaskId).toBeDefined();
    
    const createdRemoteTask = (googleTasksAPI as any).fakeTasks.get(saved[0].googleTaskId);
    expect(createdRemoteTask).toBeDefined();
    expect(createdRemoteTask.title).toBe('New Task');
  });
});
