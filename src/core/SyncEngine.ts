import { googleCalendarAPI } from './GoogleCalendarAPI';
import { googleTasksAPI } from './GoogleTasksAPI';
import { fetchWithTimeout } from './api';

export class SyncEngine {
  private lastTasksSync = 0;
  private lastEventsSync = 0;
  private pollInterval: any = null;

  private prevTasksMap = new Map<string, any>();
  private prevEventsMap = new Map<string, any>();

  // We need to trigger React updates when we pull data.
  // We'll store a reference to the update function for each key.
  private updaters = new Map<string, (val: any) => void>();

  // A queue for reactive pushes
  private pushQueue: Array<{ type: 'task' | 'event', action: 'create' | 'update' | 'delete', item: any, id?: string, calendarId?: string }> = [];

  private isPolling = false;
  private isPushing = false;
  
  private settings: any = { enableCalendarSync: true, enableTasksSync: true };

  private statusListeners = new Set<(status: string) => void>();
  private currentStatus = 'sync';
  public nextSyncTime: number = 0;

  public initialSyncComplete = false;
  private initialSyncListeners = new Set<(c: boolean) => void>();
  private errorListeners = new Set<(msg: string) => void>();

  private syncMessageListeners = new Set<(msg: string) => void>();
  private currentSyncMessage = '';

  subscribeSyncMessage(listener: (msg: string) => void) {
    this.syncMessageListeners.add(listener);
    listener(this.currentSyncMessage);
    return () => this.syncMessageListeners.delete(listener);
  }

  private setSyncMessage(msg: string) {
    this.currentSyncMessage = msg;
    this.syncMessageListeners.forEach(l => l(msg));
  }

  subscribeInitialSync(listener: (c: boolean) => void) {
    this.initialSyncListeners.add(listener);
    listener(this.initialSyncComplete);
    return () => this.initialSyncListeners.delete(listener);
  }

  subscribeError(listener: (msg: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyError(msg: string) {
    this.errorListeners.forEach(l => l(msg));
  }

  private infoListeners = new Set<(msg: string) => void>();

  subscribeInfo(listener: (msg: string) => void) {
    this.infoListeners.add(listener);
    return () => this.infoListeners.delete(listener);
  }

  private notifyInfo(msg: string) {
    this.infoListeners.forEach(l => l(msg));
  }

  subscribeStatus(listener: (status: string) => void) {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  private updateStatus(problem: boolean = false, isSyncing: boolean = false) {
    // @ts-ignore
    const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === 'true';
    if (offline || (this.settings.enableCalendarSync === false && this.settings.enableTasksSync === false)) {
      this.setStatus('sync_disabled');
    } else if (problem) {
      this.setStatus('sync_problem');
    } else if (isSyncing) {
      this.setStatus('syncing');
    } else {
      this.setStatus('sync');
    }
  }

  private setStatus(status: string) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.statusListeners.forEach(l => l(status));
    }
  }

  registerUpdater(key: string, updater: (val: any) => void) {
    this.updaters.set(key, updater);
  }

  setSettings(settings: any) {
    this.settings = settings || {};
    this.updateStatus();
  }

  start() {
    this.updateStatus();
    // @ts-ignore
    const offline = import.meta.env && import.meta.env.VITE_OFFLINE_MODE === 'true';
    if (offline || (this.settings.enableCalendarSync === false && this.settings.enableTasksSync === false)) {
      this.initialSyncComplete = true;
      this.initialSyncListeners.forEach(l => l(true));
    }

    if (this.pollInterval) return;

    const token = localStorage.getItem('google_access_token');
    const refreshToken = localStorage.getItem('google_refresh_token');
    if (token || refreshToken) {
      googleCalendarAPI.setToken(token);
      googleTasksAPI.setToken(token);
      this.poll();
    } else if (!this.initialSyncComplete) {
      this.initialSyncComplete = true;
      this.initialSyncListeners.forEach(l => l(true));
      if (!offline && (this.settings.enableCalendarSync !== false || this.settings.enableTasksSync !== false)) {
        setTimeout(() => {
          this.notifyError('Google Sync is paused: No authorization token found. Please log out and log in again to authorize Google Calendar & Tasks.');
        }, 1500);
      }
    }

    this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
    this.pollInterval = setInterval(() => this.poll(), (this.settings.syncInterval || 5) * 60 * 1000);
    // Initial setup for token polling
    setInterval(() => {
      const token = localStorage.getItem('google_access_token');
      if (token && (googleCalendarAPI as any).token !== token) {
        googleCalendarAPI.setToken(token);
        googleTasksAPI.setToken(token);
        this.poll(); // Initial poll when token arrives
      }
    }, 2000);

    window.addEventListener('online', () => {
      this.notifyInfo('Network reconnected. Forcing sync.');
      // If we are currently polling and it's hung, this forceSync will start a new poll after clearing the old interval.
      // However, we should also reset isPolling if it was stuck.
      this.isPolling = false; 
      this.forceSync();
    });
  }

  forceSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.poll();
    this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
    this.pollInterval = setInterval(() => this.poll(), (this.settings.syncInterval || 5) * 60 * 1000);
  }

  private getLocalData(key: string) {
    try {
      const saved = localStorage.getItem(`taskroot_${key}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  private setLocalData(key: string, data: any) {
    localStorage.setItem(`taskroot_${key}`, JSON.stringify(data));
    const updater = this.updaters.get(key);
    if (updater) {
      updater(data);
    }
  }

  private isRefreshing = false;

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('google_refresh_token');
    if (!refreshToken) return false;

    try {
      // @ts-ignore
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      // @ts-ignore
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
      
      const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('google_access_token', data.access_token);
        googleCalendarAPI.setToken(data.access_token);
        googleTasksAPI.setToken(data.access_token);
        return true;
      }
    } catch (e) {
      console.error('Failed to refresh token', e);
    }
    return false;
  }

  async poll() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.updateStatus(false, true); // isSyncing = true
    this.setSyncMessage('Starting sync...');

    try {
      this.setSyncMessage('Syncing Google Tasks...');
      await this.pollTasks();
      this.setSyncMessage('Syncing Google Calendar...');
      await this.pollEvents();
      this.setSyncMessage('Pushing local changes...');
      await this.processPushQueue(); // Try to process queue if there's anything left
      this.updateStatus(false, false);
      this.setSyncMessage('Sync complete');
    } catch (e: any) {
      if (e.message === 'Unauthorized' && !this.isRefreshing) {
        this.setSyncMessage('Refreshing access token...');
        this.notifyInfo('Google Session expired. Automatically refreshing access token...');
        this.isRefreshing = true;
        const refreshed = await this.refreshAccessToken();
        this.isRefreshing = false;
        
        if (refreshed) {
           this.notifyInfo('Token refreshed securely! Resuming background sync.');
           this.isPolling = false;
           return await this.poll(); // Recursively call once with new token
        } else {
           this.notifyError('Failed to refresh Google session. You may need to log out and log back in.');
        }
      }
      
      console.error('SyncEngine poll error:', e);
      this.updateStatus(true, false);
      this.notifyError(e.message || 'Error during synchronization');
      this.setSyncMessage('Sync failed');
    } finally {
      this.isPolling = false;
      this.nextSyncTime = Date.now() + (this.settings.syncInterval || 5) * 60 * 1000;
      if (!this.initialSyncComplete) {
        this.initialSyncComplete = true;
        this.initialSyncListeners.forEach(l => l(true));
      }
    }
  }

  private async pollTasks() {
    if (this.settings.enableTasksSync === false) return;

    const tasks = this.getLocalData('tasks');
    this.updatePrevTasksMap(tasks);

    // We don't have sync tokens so we just pull everything and check updatedAt.
    // In a real app, use updatedMin.
    const remoteTasks = await googleTasksAPI.fetchTasks();
    if (!remoteTasks) return; // No token or failed

    let updated = false;
    const tasksMap = new Map<string, any>(tasks.map((t: any) => [t.id, t]));

    for (const remote of remoteTasks) {
      // Find matching local task
      let localId = null;
      const match = (remote.notes || '').match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/);
      if (match) {
        localId = match[1];
      } else {
        const existing = tasks.find((t: any) => t.googleTaskId === remote.id);
        if (existing) localId = existing.id;
      }

      const existingLocalTask = localId ? tasksMap.get(localId) : null;
      const standardizedRemote: any = googleTasksAPI.toLocalTask(remote, existingLocalTask);

      if (standardizedRemote._deleted) {
        if (existingLocalTask) {
          const localUpdated = existingLocalTask.updatedAt || 0;
          if (standardizedRemote.updatedAt > localUpdated) {
            tasksMap.delete(existingLocalTask.id);
            updated = true;
          }
        }
        continue;
      }

      if (existingLocalTask) {
        const localUpdated = existingLocalTask.updatedAt || 0;
        const remoteUpdated = standardizedRemote.updatedAt || 0;

        if (remoteUpdated > localUpdated) {
          tasksMap.set(existingLocalTask.id, standardizedRemote);
          updated = true;
        }
      } else {
        tasksMap.set(standardizedRemote.id, standardizedRemote);
        updated = true;
      }
    }

    if (updated) {
      const newTasks = Array.from(tasksMap.values());
      this.setLocalData('tasks', newTasks);
      this.updatePrevTasksMap(newTasks);
    }
    this.lastTasksSync = Date.now();
  }

  private async pollEvents() {
    if (this.settings.enableCalendarSync === false) return;

    const events = this.getLocalData('events');
    const tasks = this.getLocalData('tasks'); // Needed for resolving task references
    this.updatePrevEventsMap(events);

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 2);

    const calendars = await googleCalendarAPI.fetchCalendars();
    this.setLocalData('calendars', calendars.map((c: any) => ({ id: c.id, summary: c.summary })));

    const allRemoteEvents: any[] = [];
    for (const cal of calendars) {
      const remoteEvents = await googleCalendarAPI.fetchEvents(timeMin.toISOString(), timeMax.toISOString(), cal.id);
      if (remoteEvents) {
        allRemoteEvents.push(...remoteEvents.map((e: any) => googleCalendarAPI.toLocalEvent(e, cal.id, cal.summary)));
      }
    }

    let updated = false;
    const eventsMap = new Map<string, any>(events.map((e: any) => [e.id, e]));

    for (const remote of allRemoteEvents as any[]) {
      const existingLocalEvent = eventsMap.get(remote.id);

      if (remote._deleted) {
        if (existingLocalEvent) {
          const localUpdated = existingLocalEvent.updatedAt || 0;
          if (remote.updatedAt > localUpdated) {
            eventsMap.delete(existingLocalEvent.id);
            updated = true;
          }
        }
        continue;
      }

      if (existingLocalEvent) {
        const localUpdated = existingLocalEvent.updatedAt || 0;
        const remoteUpdated = remote.updatedAt || 0;

        if (remoteUpdated > localUpdated) {
          eventsMap.set(existingLocalEvent.id, remote);
          updated = true;
        }
      } else {
        eventsMap.set(remote.id, remote);
        updated = true;
      }
    }

    if (updated) {
      const newEvents = Array.from(eventsMap.values());
      this.setLocalData('events', newEvents);
      this.updatePrevEventsMap(newEvents);
    }
    this.lastEventsSync = Date.now();
  }

  // Called from store.tsx whenever a list changes locally
  notifyDataChanged(key: string, newList: any[]) {
    if (key === 'tasks') {
      this.computeTasksDelta(newList);
    } else if (key === 'events') {
      this.computeEventsDelta(newList);
    }
    this.triggerPushQueue();
  }

  private computeTasksDelta(newTasks: any[]) {
    const newTasksMap = new Map(newTasks.map(t => [t.id, t]));

    // Find created or updated
    for (const task of newTasks) {
      const prev = this.prevTasksMap.get(task.id);
      if (!prev) {
        if (!task.googleTaskId && !task.isDraft) {
          this.pushQueue.push({ type: 'task', action: 'create', item: task });
        }
        continue;
      }

      if (task.updatedAt && prev.updatedAt && task.updatedAt > prev.updatedAt) {
        if (task.googleTaskId) {
          this.pushQueue.push({ type: 'task', action: 'update', item: task, id: task.googleTaskId });
        } else if (!task.isDraft) {
          this.pushQueue.push({ type: 'task', action: 'create', item: task });
        }
      }
    }

    // Find deleted
    for (const [id, prev] of this.prevTasksMap.entries()) {
      if (!newTasksMap.has(id) && prev.googleTaskId) {
        this.pushQueue.push({ type: 'task', action: 'delete', item: prev, id: prev.googleTaskId });
      }
    }

    this.updatePrevTasksMap(newTasks);
  }

  private computeEventsDelta(newEvents: any[]) {
    const newEventsMap = new Map(newEvents.map(e => [e.id, e]));

    for (const event of newEvents) {
      const prev = this.prevEventsMap.get(event.id);
      if (!prev) {
        if (!event.googleEventId) {
          this.pushQueue.push({ type: 'event', action: 'create', item: event });
        }
        continue;
      }

      if (!(event.updatedAt && prev.updatedAt && event.updatedAt > prev.updatedAt)) {
        continue;
      }

      let targetCalendarId = event.googleCalendarId || 'primary';

      if (event.googleCalendarId && event.googleCalendarId !== targetCalendarId) {
        if (event.googleEventId) {
          this.pushQueue.push({ type: 'event', action: 'delete', item: prev, id: event.googleEventId, calendarId: event.googleCalendarId });
        }
        this.pushQueue.push({ type: 'event', action: 'create', item: event });
      } else if (event.googleEventId) {
        this.pushQueue.push({ type: 'event', action: 'update', item: event, id: event.googleEventId, calendarId: event.googleCalendarId || 'primary' });
      } else {
        this.pushQueue.push({ type: 'event', action: 'create', item: event });
      }
    }

    for (const [id, prev] of this.prevEventsMap.entries()) {
      if (!newEventsMap.has(id) && prev.googleEventId) {
        this.pushQueue.push({ type: 'event', action: 'delete', item: prev, id: prev.googleEventId, calendarId: prev.googleCalendarId || 'primary' });
      }
    }

    this.updatePrevEventsMap(newEvents);
  }

  private updatePrevTasksMap(tasks: any[]) {
    this.prevTasksMap.clear();
    for (const t of tasks) {
      this.prevTasksMap.set(t.id, { ...t });
    }
  }

  private updatePrevEventsMap(events: any[]) {
    this.prevEventsMap.clear();
    for (const e of events) {
      this.prevEventsMap.set(e.id, { ...e });
    }
  }

  private triggerPushQueue() {
    if (this.isPushing) return;
    this.processPushQueue();
  }

  private async processPushQueue() {
    if (this.pushQueue.length === 0) return;
    this.isPushing = true;

    while (this.pushQueue.length > 0) {
      const taskOrEvent = this.pushQueue[0]; // peek
      try {
        if (taskOrEvent.type === 'task' && this.settings.enableTasksSync === false) {
          this.pushQueue.shift();
          continue;
        }
        if (taskOrEvent.type === 'event' && this.settings.enableCalendarSync === false) {
          this.pushQueue.shift();
          continue;
        }

        if (taskOrEvent.type === 'task') {
          if (taskOrEvent.action === 'create') {
            const gid = await googleTasksAPI.createTask(taskOrEvent.item);
            if (gid) {
               // Update local item with gid
               const tasks = this.getLocalData('tasks');
               const idx = tasks.findIndex((t: any) => t.id === taskOrEvent.item.id);
               if (idx !== -1) {
                 tasks[idx] = { ...tasks[idx], googleTaskId: gid };
                 this.setLocalData('tasks', tasks);
                 this.updatePrevTasksMap(tasks);
               }
            }
          } else if (taskOrEvent.action === 'update' && taskOrEvent.id) {
            await googleTasksAPI.updateTask(taskOrEvent.id, taskOrEvent.item);
          } else if (taskOrEvent.action === 'delete' && taskOrEvent.id) {
            await googleTasksAPI.deleteTask(taskOrEvent.id);
          }
        } else if (taskOrEvent.type === 'event') {
          const tasks = this.getLocalData('tasks');
          let targetCalendarId = taskOrEvent.item.googleCalendarId || 'primary';

          if (taskOrEvent.action === 'create') {
            const res = await googleCalendarAPI.createEvent(taskOrEvent.item, tasks, targetCalendarId);
            if (res) {
               const events = this.getLocalData('events');
               const idx = events.findIndex((e: any) => e.id === taskOrEvent.item.id);
               if (idx !== -1) {
                 events[idx] = { ...events[idx], googleEventId: res.id, googleCalendarId: res.calendarId };
                 this.setLocalData('events', events);
                 this.updatePrevEventsMap(events);
               }
            }
          } else if (taskOrEvent.action === 'update' && taskOrEvent.id) {
            await googleCalendarAPI.updateEvent(taskOrEvent.id, taskOrEvent.item, tasks, taskOrEvent.calendarId);
          } else if (taskOrEvent.action === 'delete' && taskOrEvent.id) {
            await googleCalendarAPI.deleteEvent(taskOrEvent.id, taskOrEvent.calendarId);
          }
        }
        // Success, remove from queue
        this.pushQueue.shift();
      } catch (e) {
        console.error('Push failed, keeping in queue', e);
        this.updateStatus(true);
        break; // Network error or something, keep in queue and try later
      }
    }
    
    this.isPushing = false;
  }
}

export const syncEngine = new SyncEngine();
