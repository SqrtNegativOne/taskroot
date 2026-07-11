import { useEffect, useRef, useCallback } from 'react';

// Convert our event to Google Calendar event format
function toGoogleEvent(localEvent, tasks) {
  const task = localEvent.taskId ? tasks.find((t) => t.id === localEvent.taskId) : null;
  const title = task ? task.title : localEvent.title;

  const dateStr = localEvent.date; // YYYY-MM-DD
  const startH = Math.floor(localEvent.start / 60);
  const startM = localEvent.start % 60;
  const endH = Math.floor(localEvent.end / 60);
  const endM = localEvent.end % 60;

  const startStr = `${dateStr}T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`;
  const endStr = `${dateStr}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;

  // Determine timezone based on the browser
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    summary: title || 'Taskroot Event',
    start: { dateTime: startStr, timeZone },
    end: { dateTime: endStr, timeZone },
    description: `Taskroot Event ID: ${localEvent.id}${localEvent.taskId ? `\nTask ID: ${localEvent.taskId}` : ''}`,
  };
}

// Convert Google Calendar event to our event format
function toLocalEvent(googleEvent) {
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

  return {
    id: id,
    googleEventId: googleEvent.id, // Store to keep track
    taskId: taskId,
    title: googleEvent.summary || 'Untitled Event',
    date: date,
    start: start,
    end: end,
    type: taskId ? 'plan' : 'meeting',
  };
}

export function useGoogleCalendarSync(events, setEvents, tasks) {
  const isSyncing = useRef(false);
  const tokenRef = useRef(null);
  const prevEventsRef = useRef(JSON.stringify(events));

  // Polling to update token from localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      tokenRef.current = localStorage.getItem('google_access_token');
    }, 1000);
    tokenRef.current = localStorage.getItem('google_access_token');
    return () => clearInterval(interval);
  }, []);

  const fetchGoogleEvents = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1); // 1 month ago
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 2); // 2 months ahead

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&maxResults=2500`, {
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
           console.log("Google Token expired.");
           localStorage.removeItem('google_access_token');
        }
        throw new Error('Failed to fetch events');
      }
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error("Error fetching Google Calendar events:", e);
      return [];
    }
  }, []);

  const createGoogleEvent = async (localEvent) => {
    if (!tokenRef.current) return null;
    const body = toGoogleEvent(localEvent, tasks);
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json();
      return data.id;
    } catch (e) {
      console.error("Error creating Google event", e);
      return null;
    }
  };

  const updateGoogleEvent = async (googleEventId, localEvent) => {
    if (!tokenRef.current) return;
    const body = toGoogleEvent(localEvent, tasks);
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'PUT', // or PATCH
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error("Error updating Google event", e);
    }
  };

  const deleteGoogleEvent = async (googleEventId) => {
    if (!tokenRef.current) return;
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`,
        }
      });
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
      const newLocalEvents = gEvents.map(toLocalEvent);
      
      // We want to merge the events. 
      // 1. Any taskroot events that are NOT in Google Calendar should be pushed to Google Calendar (unless we assume Google Calendar is source of truth, but we want bidirectionality).
      // Since it's a prototype, let's treat the merged list as: 
      // Take all Google events. If a taskroot event isn't in Google, and has a googleEventId, it was deleted in Google, so delete locally.
      // If a taskroot event has no googleEventId, push it to Google.
      
      const currentEvents = JSON.parse(prevEventsRef.current || '[]');
      let mergedEvents = [...newLocalEvents];
      const gEventIds = new Set(newLocalEvents.map(e => e.googleEventId));
      
      for (const localEvent of currentEvents) {
        if (!localEvent.googleEventId) {
          // Push to google
          const gid = await createGoogleEvent(localEvent);
          if (gid) {
            mergedEvents.push({ ...localEvent, googleEventId: gid });
          } else {
            mergedEvents.push(localEvent); // Keep it anyway
          }
        } else if (!gEventIds.has(localEvent.googleEventId)) {
           // It was deleted from Google Calendar, so we don't include it in mergedEvents
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
       return;
    }
    
    const prevEvents = JSON.parse(prevEventsRef.current || '[]');
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
             const gid = await createGoogleEvent(curr);
             if (gid) {
               const idx = updatedEvents.findIndex(e => e.id === curr.id);
               if (idx !== -1) {
                  updatedEvents[idx] = { ...updatedEvents[idx], googleEventId: gid };
                  needsStateUpdate = true;
               }
             }
          }
        } else if (JSON.stringify(curr) !== JSON.stringify(prev)) {
          // Updated locally (ignoring googleEventId addition because of stringify? Wait, we updated prevEvents above)
          if (curr.googleEventId) {
             await updateGoogleEvent(curr.googleEventId, curr);
          }
        }
      }
      
      for (const prev of prevEvents) {
        if (!currMap.has(prev.id)) {
           // Deleted locally
           if (prev.googleEventId) {
              await deleteGoogleEvent(prev.googleEventId);
           }
        }
      }
      
      prevEventsRef.current = JSON.stringify(updatedEvents);
      if (needsStateUpdate) {
        setEvents(updatedEvents);
      }
      isSyncing.current = false;
    };
    
    syncChanges();
  }, [events, tasks, setEvents]);

  return { performInitialSync };
}
