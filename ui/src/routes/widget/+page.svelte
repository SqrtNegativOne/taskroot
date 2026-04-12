<!--
  Widget window orchestrator — the only file that may import both
  DayColumnWidget and the API. Loaded by the second pywebview window
  (frameless, on_top, transparent) anchored to the right screen edge.

  Rule 8 applies here too: DayColumnWidget itself stays pure.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import DayColumnWidget, { type ECEvent } from '$lib/components/DayColumnWidget.svelte';
  import { getApi } from '$lib/api/index';
  import type { CalendarEvent, Task } from '$lib/types';

  let open = $state(true);
  let events: ECEvent[] = $state([]);

  function isoSlice(v: string | Date): string {
    const s = v instanceof Date ? v.toISOString() : v;
    return s.slice(0, 19);
  }

  function taskToECEvent(task: Task): ECEvent | null {
    if (!task.scheduled_start) return null;
    const start = isoSlice(task.scheduled_start as string);
    const durationMs = (task.expected_duration ?? 30) * 60_000;
    const end = isoSlice(new Date(new Date(start).getTime() + durationMs));
    return {
      id: task.id,
      title: task.name,
      start,
      end,
      extendedProps: { kind: 'task' }
    };
  }

  function calEventToECEvent(e: CalendarEvent): ECEvent {
    const end = e.end
      ? isoSlice(e.end)
      : isoSlice(new Date(new Date(e.start).getTime() + 30 * 60_000));
    return {
      id: e.id,
      title: e.name,
      start: isoSlice(e.start),
      end,
      extendedProps: { kind: 'event' }
    };
  }

  async function refresh(): Promise<void> {
    const api = await getApi();
    const [calEvents, tasks] = await Promise.all([
      api.listDayEvents(),
      api.listTodayTasks()
    ]);
    events = [
      ...calEvents.map(calEventToECEvent),
      ...tasks.flatMap((t) => {
        const e = taskToECEvent(t);
        return e ? [e] : [];
      })
    ];
  }

  onMount(refresh);

  function handleToggle() {
    open = !open;
  }

  async function handleEventDrop(info: any) {
    const api = await getApi();
    const ev = info.event;
    const newStart = isoSlice(ev.start);
    const newEnd = isoSlice(ev.end);
    if (ev.extendedProps?.kind === 'task') {
      await api.scheduleTask(ev.id as string, newStart, newEnd);
    } else {
      await api.updateEvent({ id: ev.id as string, start: newStart, end: newEnd });
    }
    await refresh();
  }

  async function handleEventResize(info: any) {
    const api = await getApi();
    const ev = info.event;
    const newStart = isoSlice(ev.start);
    const newEnd = isoSlice(ev.end);
    if (ev.extendedProps?.kind === 'task') {
      await api.scheduleTask(ev.id as string, newStart, newEnd);
    } else {
      await api.updateEvent({ id: ev.id as string, start: newStart, end: newEnd });
    }
    await refresh();
  }

  async function handleDateClick(info: any) {
    const api = await getApi();
    const start = isoSlice(info.date instanceof Date ? info.date : new Date(info.dateStr));
    const end = isoSlice(new Date(new Date(start).getTime() + 30 * 60_000));
    await api.createEvent({ name: 'New event', start, end });
    await refresh();
  }

  async function handleEventRemove(id: string) {
    const ev = events.find((e) => e.id === id);
    if (ev?.extendedProps?.kind === 'task') {
      // Removing a task from the widget unschedules it — tasks are not deleted here.
      // The backend has no unschedule method yet; for now just refresh.
      await refresh();
      return;
    }
    const api = await getApi();
    await api.deleteEvent(id);
    await refresh();
  }

  function handleEventClick(_info: any) {
    // Reserved for a future detail panel.
  }
</script>

<DayColumnWidget
  {events}
  {open}
  onToggle={handleToggle}
  onEventClick={handleEventClick}
  onEventDrop={handleEventDrop}
  onEventResize={handleEventResize}
  onDateClick={handleDateClick}
  onEventRemove={handleEventRemove}
/>

<style>
  /*
   * The widget window has transparent=True in pywebview.
   * Override the layout's body background so only the tab + panel are opaque.
   */
  :global(body) {
    background: transparent !important;
  }
</style>
