import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleCalendarAPI } from './GoogleCalendarAPI';
import * as api from '../store/api';

vi.mock('../store/api', () => ({
  fetchWithTimeout: vi.fn(),
}));

describe('GoogleCalendarAPI', () => {
  let googleCalendarAPI: GoogleCalendarAPI;

  beforeEach(() => {
    vi.resetAllMocks();
    googleCalendarAPI = new GoogleCalendarAPI();
    googleCalendarAPI.setToken('fake-token');
  });

  describe('fetchEvents', () => {
    it('requests events with proper parameters', async () => {
      const mockFetch = api.fetchWithTimeout as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'e1' }] })
      });

      const events = await googleCalendarAPI.fetchEvents('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');
      
      expect(mockFetch).toHaveBeenCalledOnce();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('timeMin=2024-01-01T00:00:00Z');
      expect(url).toContain('timeMax=2024-01-31T23:59:59Z');
      expect(url).toContain('singleEvents=false');
      expect(url).toContain('maxResults=2500');
      
      expect(events).toHaveLength(1);
    });

    it('throws Unauthorized on 401', async () => {
      const mockFetch = api.fetchWithTimeout as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      
      await expect(googleCalendarAPI.fetchEvents('start', 'end')).rejects.toThrow('Unauthorized');
    });
  });

  describe('toGoogleEvent', () => {
    it('stores taskrootEventId in private extendedProperties', () => {
      const localEvent = { id: 'e123', title: 'Meeting', date: '2024-05-10', start: 600, end: 660 }; // 10:00 to 11:00
      const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, []);
      
      expect(googleEvent.extendedProperties?.private?.taskrootEventId).toBe('e123');
      expect(googleEvent.start.dateTime).toContain('2024-05-10T10:00:00');
      expect(googleEvent.end.dateTime).toContain('2024-05-10T11:00:00');
    });

    it('handles events ending at midnight (end >= 24)', () => {
      const localEvent = { id: 'e123', title: 'All day', date: '2024-05-10', start: 0, end: 1440 }; // 00:00 to 24:00
      const googleEvent = googleCalendarAPI.toGoogleEvent(localEvent, []);
      
      expect(googleEvent.start.dateTime).toContain('2024-05-10T00:00:00');
      expect(googleEvent.end.dateTime).toContain('2024-05-11T00:00:00');
    });
  });

  describe('toLocalEvent', () => {
    it('extracts taskrootEventId from private extendedProperties', () => {
      const googleEvent = {
        id: 'g123',
        summary: 'Meeting',
        start: { dateTime: '2024-05-10T10:00:00Z' },
        end: { dateTime: '2024-05-10T11:00:00Z' },
        extendedProperties: {
          private: {
            taskrootEventId: 'e456',
            type: 'plan'
          }
        }
      };
      
      const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
      expect(localEvent.id).toBe('e456');
      expect(localEvent.googleEventId).toBe('g123');
      expect(localEvent.type).toBe('plan');
    });

    it('falls back to regex matching description if no extendedProperties exist', () => {
      const googleEvent = {
        id: 'g123',
        summary: 'Legacy Meeting',
        start: { dateTime: '2024-05-10T10:00:00Z' },
        end: { dateTime: '2024-05-10T11:00:00Z' },
        description: 'Taskroot Event ID: e789\nTask ID: t111'
      };
      
      const localEvent = googleCalendarAPI.toLocalEvent(googleEvent);
      expect(localEvent.id).toBe('e789');
      expect(localEvent.taskId).toBe('t111');
      expect(localEvent.type).toBe('plan');
    });
  });
});
