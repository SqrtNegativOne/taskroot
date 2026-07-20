import { useEffect, useRef, useCallback } from 'react';
import { useNotification } from './notifications';

export const tasksApiClient = {
  fetchTasks: async (token: string, tasklistId = '@default') => {
    const allTasks: any[] = [];
    let pageToken: string | null = null;
    do {
      const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks`);
      url.searchParams.append('showCompleted', 'true');
      url.searchParams.append('showHidden', 'true');
      url.searchParams.append('maxResults', '100');
      if (pageToken) url.searchParams.append('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return res;
      const data = await res.json();
      if (data.items) allTasks.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
    
    return { ok: true, items: allTasks };
  },
  createTask: async (body: any, token: string, tasklistId = '@default') => {
    return await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  updateTask: async (googleTaskId: string, body: any, token: string, tasklistId = '@default') => {
    return await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  deleteTask: async (googleTaskId: string, token: string, tasklistId = '@default') => {
    return await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
};

export function toLocalTask(googleTask: any, existingLocalTask: any = null) {
  let localStatus = 'todo';
  if (googleTask.status === 'completed') {
    localStatus = 'done';
  }

  let id = googleTask.id;
  const match = (googleTask.notes || '').match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/);
  if (match) {
    id = match[1];
  }
  
  if (existingLocalTask) {
    id = existingLocalTask.id;
  }

  const defaultTask = {
    id,
    googleTaskId: googleTask.id,
    title: googleTask.title || '',
    status: localStatus,
    priority: 'P2',
    tags: [],
    subtasks: [],
    parent_task: null,
    dependency: null,
    est: 0,
    added: new Date().toISOString(),
    isDraft: false,
    notes: googleTask.notes || '',
    due: googleTask.due ? googleTask.due.split('T')[0] : undefined
  };

  if (existingLocalTask) {
    return {
      ...existingLocalTask,
      googleTaskId: googleTask.id,
      title: googleTask.title || '',
      status: localStatus,
      notes: googleTask.notes || '',
      due: googleTask.due ? googleTask.due.split('T')[0] : existingLocalTask.due
    };
  }
  
  return defaultTask;
}

export function toGoogleTask(localTask: any) {
  let notes = localTask.notes || '';
  if (!notes.includes(`Taskroot Task ID: ${localTask.id}`)) {
    notes = `Taskroot Task ID: ${localTask.id}\n${notes}`;
  }
  return {
    title: localTask.title,
    notes: notes,
    status: localTask.status === 'done' ? 'completed' : 'needsAction',
    due: localTask.due ? new Date(localTask.due).toISOString() : null
  };
}

export function useGoogleTasksSync(tasks: any[], setTasks: (val: any) => void, apiClient = tasksApiClient) {
  const { notify } = useNotification();
  const isSyncing = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const prevTasksRef = useRef(JSON.stringify(tasks));
  
  useEffect(() => {
    const interval = setInterval(() => {
      tokenRef.current = localStorage.getItem('google_access_token');
    }, 1000);
    tokenRef.current = localStorage.getItem('google_access_token');
    return () => clearInterval(interval);
  }, []);

  const fetchGoogleTasks = useCallback(async () => {
    if (!tokenRef.current) return null;
    try {
      const res: any = await apiClient.fetchTasks(tokenRef.current);
      if (!res.ok) {
        if (res.status === 401) {
          // Token refresh is handled by useGoogleCalendarSync, we can just wait for it
          return null;
        }
        console.warn(`Failed to fetch google tasks`);
        return null;
      }
      return res.items || [];
    } catch (e) {
      console.error("Error fetching Google Tasks:", e);
      return null;
    }
  }, [apiClient]);

  const createGoogleTask = async (localTask: any) => {
    if (!tokenRef.current) return null;
    const body = toGoogleTask(localTask);
    try {
      const res = await apiClient.createTask(body, tokenRef.current);
      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json();
      return data.id;
    } catch (e) {
      console.error("Error creating Google task", e);
      return null;
    }
  };

  const updateGoogleTask = async (googleTaskId: string, localTask: any) => {
    if (!tokenRef.current) return;
    const body = toGoogleTask(localTask);
    try {
      await apiClient.updateTask(googleTaskId, body, tokenRef.current);
    } catch (e) {
      console.error("Error updating Google task", e);
    }
  };

  const deleteGoogleTask = async (googleTaskId: string) => {
    if (!tokenRef.current) return;
    try {
      await apiClient.deleteTask(googleTaskId, tokenRef.current);
    } catch (e) {
      console.error("Error deleting Google task", e);
    }
  };

  const performInitialSync = useCallback(async () => {
    if (!tokenRef.current || isSyncing.current) return;
    isSyncing.current = true;
    try {
      const gTasks = await fetchGoogleTasks();
      if (!gTasks) {
         isSyncing.current = false;
         return;
      }
      
      const currentTasks = JSON.parse(prevTasksRef.current || '[]');
      const currentTasksMap = new Map(currentTasks.map((t: any) => [t.id, t]));
      
      let mergedTasks: any[] = [];
      const gTaskIds = new Set(gTasks.map((t: any) => t.id));
      
      // 1. Process Google Tasks, matching with local ones
      for (const gTask of gTasks) {
        // Find existing local task by ID from notes or by googleTaskId
        let localId = null;
        const match = (gTask.notes || '').match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/);
        if (match) {
          localId = match[1];
        } else {
          // Check if any local task has this googleTaskId
          const existing = currentTasks.find((t: any) => t.googleTaskId === gTask.id);
          if (existing) localId = existing.id;
        }
        
        const existingLocalTask = localId ? currentTasksMap.get(localId) : null;
        mergedTasks.push(toLocalTask(gTask, existingLocalTask));
      }
      
      // 2. Process local tasks that aren't in Google yet
      for (const localTask of currentTasks) {
        if (!localTask.googleTaskId) {
          const newGoogleTaskId = await createGoogleTask(localTask);
          if (newGoogleTaskId) {
            mergedTasks.push({ ...localTask, googleTaskId: newGoogleTaskId });
          } else {
            mergedTasks.push(localTask);
          }
        } else if (!gTaskIds.has(localTask.googleTaskId)) {
          // Task was deleted from Google, so we delete it locally by not pushing it to mergedTasks
        } else {
          // Handled in step 1
        }
      }
      
      // Remove duplicates based on ID
      const uniqueTasksMap = new Map();
      mergedTasks.forEach(t => {
        uniqueTasksMap.set(t.id, t);
      });
      
      const finalTasks = Array.from(uniqueTasksMap.values());
      prevTasksRef.current = JSON.stringify(finalTasks);
      setTasks(finalTasks);
    } finally {
      isSyncing.current = false;
    }
  }, [fetchGoogleTasks, setTasks]);

  useEffect(() => {
    let interval: any;
    const checkToken = () => {
      if (tokenRef.current) {
        performInitialSync();
        clearInterval(interval);
      }
    };
    interval = setInterval(checkToken, 2000);
    checkToken();
    return () => clearInterval(interval);
  }, [performInitialSync]);

  useEffect(() => {
    if (isSyncing.current || !tokenRef.current) {
       prevTasksRef.current = JSON.stringify(tasks);
       return;
    }
    
    const prevTasks = JSON.parse(prevTasksRef.current || '[]');
    const currentTasks = tasks;
    
    const prevMap = new Map(prevTasks.map((t: any) => [t.id, t]));
    const currMap = new Map(currentTasks.map((t: any) => [t.id, t]));
    
    const syncChanges = async () => {
      isSyncing.current = true;
      let updatedTasks = [...currentTasks];
      let needsStateUpdate = false;
      
      for (const curr of currentTasks) {
        const prev = prevMap.get(curr.id);
        if (!prev) {
          if (!curr.googleTaskId && !curr.isDraft) {
             const result = await createGoogleTask(curr);
             if (result) {
               const idx = updatedTasks.findIndex(t => t.id === curr.id);
               if (idx !== -1) {
                  updatedTasks[idx] = { ...updatedTasks[idx], googleTaskId: result };
                  needsStateUpdate = true;
               }
             }
          }
        } else {
          const currGoogle = toGoogleTask(curr);
          const prevGoogle = toGoogleTask(prev);
          if (JSON.stringify(currGoogle) !== JSON.stringify(prevGoogle)) {
            if (curr.googleTaskId) {
               await updateGoogleTask(curr.googleTaskId, curr);
            }
          }
        }
      }
      
      for (const prev of prevTasks) {
        if (!currMap.has(prev.id)) {
           if (prev.googleTaskId) {
              await deleteGoogleTask(prev.googleTaskId);
           }
        }
      }
      
      prevTasksRef.current = JSON.stringify(updatedTasks);
      if (needsStateUpdate) {
        setTasks(updatedTasks);
      }
      isSyncing.current = false;
    };
    
    syncChanges();
  }, [tasks, setTasks]);

  return { performInitialSync };
}
