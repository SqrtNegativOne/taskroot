export class GoogleCalendarAPI {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async fetchEvents(timeMin: string, timeMax: string, calendarId = 'primary') {
    if (!this.token) throw new Error('Unauthorized');
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=false&maxResults=2500`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized');
      console.warn(`Failed to fetch events for calendar ${calendarId}`);
      return null;
    }
    const data = await res.json();
    return data.items || [];
  }

  async fetchCalendars() {
    if (!this.token) return [{ id: 'primary', summary: 'Primary Calendar' }];
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized');
      console.warn(`Failed to fetch calendars`);
      return [{ id: 'primary', summary: 'Primary Calendar' }];
    }
    const data = await res.json();
    return data.items || [{ id: 'primary', summary: 'Primary Calendar' }];
  }

  async createEvent(localEvent: any, tasks: any[], calendarId = 'primary') {
    if (!this.token) return null;
    const body = this.toGoogleEvent(localEvent, tasks);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to create event');
    const data = await res.json();
    return { id: data.id, calendarId };
  }

  async updateEvent(googleEventId: string, localEvent: any, tasks: any[], calendarId = 'primary') {
    if (!this.token) return;
    const body = this.toGoogleEvent(localEvent, tasks);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to update event');
  }

  async deleteEvent(googleEventId: string, calendarId = 'primary') {
    if (!this.token) return;
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!res.ok) throw new Error('Failed to delete event');
  }

  toGoogleEvent(localEvent: any, tasks: any[]) {
    const task = localEvent.taskId ? tasks.find((t: any) => t.id === localEvent.taskId) : null;
    const title = task ? task.title : localEvent.title;

    const dateStr = localEvent.date;
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const r: any = {
      summary: title || 'Taskroot Event',
      start: { dateTime: startStr, timeZone },
      end: { dateTime: endStr, timeZone },
      description: localEvent.description || '',
      extendedProperties: {
        private: {
          taskrootEventId: localEvent.id,
          ...(localEvent.taskId ? { taskId: localEvent.taskId } : {}),
          type: localEvent.type || '',
        }
      }
    };
    
    if (localEvent.rrule) {
      r.recurrence = [`RRULE:${localEvent.rrule}`];
    }
    return r;
  }

  toLocalEvent(googleEvent: any, calendarId = 'primary', calendarSummary = '') {
    if (googleEvent.status === 'cancelled') {
      let id = googleEvent.id;
      if (googleEvent.extendedProperties?.private?.taskrootEventId) {
        id = googleEvent.extendedProperties.private.taskrootEventId;
      }
      return { id, _deleted: true, updatedAt: new Date(googleEvent.updated || 0).getTime() };
    }

    let date, start, end;

    if (googleEvent.start?.dateTime) {
      const startDt = new Date(googleEvent.start.dateTime);
      const endDt = new Date(googleEvent.end?.dateTime || googleEvent.start.dateTime);
      const y = startDt.getFullYear();
      const m = (startDt.getMonth() + 1).toString().padStart(2, '0');
      const d = startDt.getDate().toString().padStart(2, '0');
      date = `${y}-${m}-${d}`;
      start = startDt.getHours() * 60 + startDt.getMinutes();
      
      if (endDt.getDate() !== startDt.getDate() && endDt.getTime() > startDt.getTime()) {
        end = 24 * 60;
      } else {
        end = endDt.getHours() * 60 + endDt.getMinutes();
      }
    } else if (googleEvent.start?.date) {
      date = googleEvent.start.date;
      start = 0;
      end = 24 * 60;
    }

    let taskId = null;
    let id = googleEvent.id;
    let type = googleEvent.start?.date ? 'info' : 'busy';

    if (googleEvent.extendedProperties?.private?.taskrootEventId) {
      const priv = googleEvent.extendedProperties.private;
      if (priv.taskId) taskId = priv.taskId;
      if (priv.taskrootEventId) id = priv.taskrootEventId;
      if (priv.type) type = priv.type;
    } else {
      const desc = googleEvent.description || '';
      const match = desc.match(/Task ID: (t\d+)/);
      if (match) {
        taskId = match[1];
      }
      const idMatch = desc.match(/Taskroot Event ID: (e[0-9a-zA-Z-]+)/);
      if (idMatch) {
        id = idMatch[1];
      }
      if (taskId) type = 'plan';
    }

    let category = calendarSummary;

    const rrule = googleEvent.recurrence && googleEvent.recurrence.length > 0
      ? googleEvent.recurrence.find((r: string) => r.startsWith('RRULE:'))?.replace(/^RRULE:/i, '')
      : undefined;

    return {
      id: id,
      googleEventId: googleEvent.id,
      googleCalendarId: calendarId,
      taskId: taskId,
      title: googleEvent.summary || 'Untitled Event',
      date: date,
      start: start,
      end: end,
      type: type,
      category: category,
      rrule: rrule,
      updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now()
    };
  }
}

export const googleCalendarAPI = new GoogleCalendarAPI();
