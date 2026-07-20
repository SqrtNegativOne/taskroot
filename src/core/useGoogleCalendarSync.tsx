import { useEffect, useRef, useCallback } from 'react';
import { useNotification } from './notifications';
import { useStored } from './store';

// Convert our event to Google Calendar event format
export function toGoogleEvent(localEvent, tasks) {
  const task = localEvent.taskId ? tasks.find((t) => t.id === localEvent.taskId) : null;
  const title = task ? task.title : localEvent.title;

  const dateStr = localEvent.date; // YYYY-MM-DD
  const startH = Math.floor(localEvent.start / 60);
  const startM = localEvent.start % 60;
  let endH = Math.floor(localEvent.end / 60);
  const endM = localEvent.end % 60;
  let endYMD = dateStr;

  if (endH >= 24) {
    endH = 0;
    const endDt = new Date(dateStr);
    endDt.setDate(endDt.getDate() + 1);
    const y = endDt.getFullYear();
    const m = (endDt.getMonth() + 1).toString().padStart(2, '0');
    const d = endDt.getDate().toString().padStart(2, '0');
    endYMD = `${y}-${m}-${d}`;
  }

  const startStr = `${dateStr}T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`;
  const endStr = `${endYMD}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;

  // Determine timezone based on the browser
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const r: any = {
    summary: title || 'Taskroot Event',
    start: { dateTime: startStr, timeZone },
    end: { dateTime: endStr, timeZone },
    description: `Taskroot Event ID: ${localEvent.id}${localEvent.taskId ? `\nTask ID: ${localEvent.taskId}` : ''}`,
  };
  
  if (localEvent.rrule) {
    r.recurrence = [`RRULE:${localEvent.rrule}`];
  }
  return r;
}

// Convert Google Calendar event to our event format
export function toLocalEvent(googleEvent, calendarId = 'primary', categoryMap = {}) {
  let date, start, end;

  if (googleEvent.start.dateTime) {
    const startDt = new Date(googleEvent.start.dateTime);
    const endDt = new Date(googleEvent.end.dateTime);
    const y = startDt.getFullYear();
    const m = (startDt.getMonth() + 1).toString().padStart(2, '0');
    const d = startDt.getDate().toString().padStart(2, '0');
    date = `${y}-${m}-${d}`;
    start = startDt.getHours() * 60 + startDt.getMinutes();
    
    // if event goes into next day, just cap it to 24h
    if (endDt.getDate() !== startDt.getDate() && endDt.getTime() > startDt.getTime()) {
      end = 24 * 60;
    } else {
      end = endDt.getHours() * 60 + endDt.getMinutes();
    }
  } else if (googleEvent.start.date) {
    // all-day event
    date = googleEvent.start.date;
    start = 0;
    end = 24 * 60;
  }

  // Check if it's a taskroot event by looking at description
  let taskId = null;
  const desc = googleEvent.description || '';
  const match = desc.match(/Task ID: (t\d+)/);
  if (match) {
    taskId = match[1];
  }
  const idMatch = desc.match(/Taskroot Event ID: (e[0-9a-zA-Z-]+)/);
  const id = idMatch ? idMatch[1] : googleEvent.id;

  let category = '';
  if (calendarId !== 'primary') {
    for (const [cat, cid] of Object.entries(categoryMap || {})) {
      if (cid === calendarId) {
        category = cat;
        break;
      }
    }
  }

  const rrule = googleEvent.recurrence && googleEvent.recurrence.length > 0
    ? googleEvent.recurrence.find((r: string) => r.startsWith('RRULE:'))?.replace(/^RRULE:/i, '')
    : undefined;

  return {
    id: id,
    googleEventId: googleEvent.id, // Store to keep track
    googleCalendarId: calendarId,
    taskId: taskId,
    title: googleEvent.summary || 'Untitled Event',
    date: date,
    start: start,
    end: end,
    type: taskId ? 'plan' : (googleEvent.start?.date ? 'info' : 'busy'),
    category: category,
    rrule: rrule,
  };
}

export const defaultApiClient = {
  fetchCalendars: async (token) => {
    return await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },
  fetchEvents: async (timeMin, timeMax, token, calendarId = 'primary') => {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res;
  },
  createEvent: async (body, token, calendarId = 'primary') => {
    return await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  updateEvent: async (googleEventId, body, token, calendarId = 'primary') => {
    return await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  deleteEvent: async (googleEventId, token, calendarId = 'primary') => {
    return await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
};

export function useGoogleCalendarSync(events, setEvents, tasks, apiClient = defaultApiClient) {
  const { notify } = useNotification();
  const [settings] = useStored('settings', {} as any);
  const isSyncing = useRef(false);
  const tokenRef = useRef(null);
  const prevEventsRef = useRef(JSON.stringify(events));
  const prevTasksRef = useRef(JSON.stringify(tasks));
  const notifiedNoToken = useRef(false);

  // Polling to update token from localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      tokenRef.current = localStorage.getItem('google_access_token');
      if (!tokenRef.current && !notifiedNoToken.current && !import.meta.env.DEV) {
        notifiedNoToken.current = true;
        setTimeout(() => notify("No Google account detected. Skipping Calendar sync.", "info"), 1000);
      }
    }, 1000);
    tokenRef.current = localStorage.getItem('google_access_token');
    
    if (!tokenRef.current && !notifiedNoToken.current && !import.meta.env.DEV) {
      notifiedNoToken.current = true;
      setTimeout(() => notify("No Google account detected. Skipping Calendar sync.", "info"), 1000);
    }
    
    return () => clearInterval(interval);
  }, [notify]);

  const fetchGoogleEvents = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1); // 1 month ago
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 2); // 2 months ahead
      
      // Store windows for later use
      (window as any).lastTimeMin = timeMin;
      (window as any).lastTimeMax = timeMax;

      const categoryMap = settings?.categoryCalendars || {};
      const calendarIdsToSync = new Set(['primary']);
      for (const cid of Object.values(categoryMap)) {
        if (typeof cid === 'string' && cid) calendarIdsToSync.add(cid);
      }

      const allEvents = [];
      let needsRefresh = false;

      for (const calendarId of Array.from(calendarIdsToSync)) {
        const res = await apiClient.fetchEvents(timeMin.toISOString(), timeMax.toISOString(), tokenRef.current, calendarId);
        if (!res.ok) {
          if (res.status === 401) {
            needsRefresh = true;
            break;
          }
          console.warn(`Failed to fetch events for calendar ${calendarId}`);
          continue;
        }
        const data = await res.json();
        const items = data.items || [];
        allEvents.push(...items.map(e => toLocalEvent(e, calendarId, categoryMap)));
      }

      if (needsRefresh) {
         console.log("Google Token expired. Attempting to refresh via frontend...");
         try {
           const refreshToken = localStorage.getItem('google_refresh_token');
           if (!refreshToken) throw new Error("No refresh token");

           const res = await fetch('https://oauth2.googleapis.com/token', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
               client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
               refresh_token: refreshToken,
               grant_type: 'refresh_token'
             })
           });
           
           const result = await res.json();
           const newAccessToken = result.access_token;
           
           if (newAccessToken) {
             localStorage.setItem('google_access_token', newAccessToken);
             tokenRef.current = newAccessToken;
             
             // Retry the fetches
             const retryAllEvents = [];
             for (const calendarId of Array.from(calendarIdsToSync)) {
                const retryRes = await apiClient.fetchEvents(timeMin.toISOString(), timeMax.toISOString(), newAccessToken, calendarId);
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  const items = retryData.items || [];
                  retryAllEvents.push(...items.map(e => toLocalEvent(e, calendarId, categoryMap)));
                }
             }
             return retryAllEvents;
           } else {
             throw new Error(result.error_description || "Failed to refresh token");
           }
         } catch (refreshError) {
           console.error("Token refresh failed:", refreshError);
           localStorage.removeItem('google_access_token');
           notify("Google Calendar token expired. Please log in again.", "error");
           return [];
         }
      }

      return allEvents;
    } catch (e) {
      console.error("Error fetching Google Calendar events:", e);
      return [];
    }
  }, [apiClient, notify, settings?.categoryCalendars]);

  const createGoogleEvent = async (localEvent) => {
    if (!tokenRef.current) return null;
    const body = toGoogleEvent(localEvent, tasks);
    let calendarId = 'primary';
    if (localEvent.category && settings?.categoryCalendars && settings.categoryCalendars[localEvent.category]) {
      calendarId = settings.categoryCalendars[localEvent.category];
    }
    
    try {
      const res = await apiClient.createEvent(body, tokenRef.current, calendarId);
      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json();
      return { id: data.id, calendarId };
    } catch (e) {
      console.error("Error creating Google event", e);
      return null;
    }
  };

  const updateGoogleEvent = async (googleEventId, localEvent, calendarId = 'primary') => {
    if (!tokenRef.current) return;
    const body = toGoogleEvent(localEvent, tasks);
    try {
      await apiClient.updateEvent(googleEventId, body, tokenRef.current, calendarId);
    } catch (e) {
      console.error("Error updating Google event", e);
    }
  };

  const deleteGoogleEvent = async (googleEventId, calendarId = 'primary') => {
    if (!tokenRef.current) return;
    try {
      await apiClient.deleteEvent(googleEventId, tokenRef.current, calendarId);
    } catch (e) {
      console.error("Error deleting Google event", e);
    }
  };

  const performInitialSync = useCallback(async () => {
    if (!tokenRef.current || isSyncing.current) return;
    isSyncing.current = true;
    try {
      const gEvents = await fetchGoogleEvents();
      if (!gEvents) {
         isSyncing.current = false;
         return;
      }
      // We want to merge the events. 
      // 1. Any taskroot events that are NOT in Google Calendar should be pushed to Google Calendar (unless we assume Google Calendar is source of truth, but we want bidirectionality).
      // Since it's a prototype, let's treat the merged list as: 
      // Take all Google events. If a taskroot event isn't in Google, and has a googleEventId, it was deleted in Google, so delete locally.
      // If a taskroot event has no googleEventId, push it to Google.
      
      const currentEvents = JSON.parse(prevEventsRef.current || '[]');
      let mergedEvents = [...gEvents];
      const gEventIds = new Set(gEvents.map(e => e.googleEventId));
      
      for (const localEvent of currentEvents) {
        if (!localEvent.googleEventId) {
          // Push to google
          const result = await createGoogleEvent(localEvent);
          if (result) {
            mergedEvents.push({ ...localEvent, googleEventId: result.id, googleCalendarId: result.calendarId });
          } else {
            mergedEvents.push(localEvent); // Keep it anyway
          }
        } else if (!gEventIds.has(localEvent.googleEventId)) {
           // Check if it's within the sync window
           const localDate = new Date(localEvent.date);
           if ((window as any).lastTimeMin && (window as any).lastTimeMax && localDate >= (window as any).lastTimeMin && localDate <= (window as any).lastTimeMax) {
               // It was deleted from Google Calendar, so we don't include it in mergedEvents
           } else {
               mergedEvents.push(localEvent); // Keep it, it's outside the window
           }
        } else {
           // We might need to handle updates. For now, Google Calendar wins if it's there.
           // However, if the user made changes locally while offline, they'd be overwritten.
           // Since it's bidirectional, we could check last modified, but simple approach is ok for now.
        }
      }
      
      // Keep events that are outside the 1-month-ago to 2-months-ahead window? 
      // For simplicity, just replace our events list, but re-add the ones that are outside the window if we had them.
      
      // Remove duplicates based on ID (which is taskroot ID if available)
      const uniqueEventsMap = new Map();
      mergedEvents.forEach(e => {
        uniqueEventsMap.set(e.id, e);
      });
      
      const finalEvents = Array.from(uniqueEventsMap.values());
      prevEventsRef.current = JSON.stringify(finalEvents);
      setEvents(finalEvents);
    } finally {
      isSyncing.current = false;
    }
  }, [fetchGoogleEvents, setEvents, tasks]);

  // Initial pull when token is available
  useEffect(() => {
    let interval;
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

  // Push changes when local events change
  useEffect(() => {
    if (isSyncing.current || !tokenRef.current) {
       prevEventsRef.current = JSON.stringify(events);
       prevTasksRef.current = JSON.stringify(tasks);
       return;
    }
    
    const prevEvents = JSON.parse(prevEventsRef.current || '[]');
    const prevTasks = JSON.parse(prevTasksRef.current || '[]');
    const currentEvents = events;
    
    const prevMap = new Map(prevEvents.map(e => [e.id, e]));
    const currMap = new Map(currentEvents.map(e => [e.id, e]));
    
    const syncChanges = async () => {
      isSyncing.current = true;
      let updatedEvents = [...currentEvents];
      let needsStateUpdate = false;
      
      for (const curr of currentEvents) {
        const prev = prevMap.get(curr.id);
        if (!prev) {
          // Created locally
          if (!curr.googleEventId) {
             const result = await createGoogleEvent(curr);
             if (result) {
               const idx = updatedEvents.findIndex(e => e.id === curr.id);
               if (idx !== -1) {
                  updatedEvents[idx] = { ...updatedEvents[idx], googleEventId: result.id, googleCalendarId: result.calendarId };
                  needsStateUpdate = true;
               }
             }
          }
        } else {
          // Updated locally?
          // If category changed, meaning target calendar changed:
          let targetCalendarId = 'primary';
          if (curr.category && settings?.categoryCalendars && settings.categoryCalendars[curr.category]) {
            targetCalendarId = settings.categoryCalendars[curr.category];
          }
          
          if (curr.googleCalendarId && curr.googleCalendarId !== targetCalendarId) {
             // Moved to a different calendar
             if (curr.googleEventId) {
                await deleteGoogleEvent(curr.googleEventId, curr.googleCalendarId);
             }
             const result = await createGoogleEvent(curr);
             if (result) {
                const idx = updatedEvents.findIndex(e => e.id === curr.id);
                if (idx !== -1) {
                  updatedEvents[idx] = { ...updatedEvents[idx], googleEventId: result.id, googleCalendarId: result.calendarId };
                  needsStateUpdate = true;
                }
             }
          } else {
             // Same calendar, check if content changed
             const currGoogle = toGoogleEvent(curr, tasks);
             const prevGoogle = toGoogleEvent(prev, prevTasks);
             if (JSON.stringify(currGoogle) !== JSON.stringify(prevGoogle)) {
                if (curr.googleEventId) {
                   await updateGoogleEvent(curr.googleEventId, curr, curr.googleCalendarId || 'primary');
                }
             }
          }
        }
      }
      
      for (const prev of prevEvents) {
        if (!currMap.has(prev.id)) {
           // Deleted locally
           if (prev.googleEventId) {
              await deleteGoogleEvent(prev.googleEventId, prev.googleCalendarId || 'primary');
           }
        }
      }
      
      prevEventsRef.current = JSON.stringify(updatedEvents);
      prevTasksRef.current = JSON.stringify(tasks);
      if (needsStateUpdate) {
        setEvents(updatedEvents);
      }
      isSyncing.current = false;
    };
    
    syncChanges();
  }, [events, tasks, setEvents]);

  return { performInitialSync };
}
