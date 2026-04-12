<!--
  Prototype preview page for the DayColumnWidget.
  Visit /widget-preview during `npm run dev` to interact with it.
  This file is temporary scaffolding — not part of the production app.
-->
<script lang="ts">
  import DayColumnWidget, { type ECEvent } from '$lib/components/DayColumnWidget.svelte';

  let open = $state(true);

  function today(time: string): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${time}`;
  }

  let nextId = 100;

  let events: ECEvent[] = $state([
    {
      id: '1',
      title: 'Morning standup',
      start: today('09:00'),
      end: today('09:30'),
      extendedProps: { kind: 'event' }
    },
    {
      id: '2',
      title: 'Build auth middleware',
      start: today('09:30'),
      end: today('11:30'),
      extendedProps: { kind: 'task' }
    },
    {
      id: '3',
      title: 'Lunch break',
      start: today('12:00'),
      end: today('13:00'),
      extendedProps: { kind: 'event' }
    },
    {
      id: '4',
      title: '1:1 with Sam',
      start: today('13:30'),
      end: today('14:00'),
      extendedProps: { kind: 'event' }
    },
    {
      id: '5',
      title: 'Review PR #42',
      start: today('14:00'),
      end: today('14:15'),
      extendedProps: { kind: 'task' }
    },
    {
      id: '6',
      title: 'Write API tests',
      start: today('14:00'),
      end: today('15:30'),
      extendedProps: { kind: 'task' }
    },
    {
      id: '7',
      title: 'Sprint retro',
      start: today('15:30'),
      end: today('16:30'),
      extendedProps: { kind: 'event' }
    },
    {
      id: '8',
      title: 'Fix deploy script',
      start: today('16:30'),
      end: today('17:00'),
      extendedProps: { kind: 'task' }
    }
  ]);

  let log: string[] = $state([]);

  function addLog(msg: string) {
    log = [msg, ...log].slice(0, 20);
  }

  function handleToggle() {
    open = !open;
  }

  function handleEventClick(info: any) {
    addLog(`Clicked: "${info.event.title}"`);
  }

  function handleEventDrop(info: any) {
    const ev = info.event;
    addLog(`Moved "${ev.title}" → ${new Date(ev.start).toLocaleTimeString()}`);
    events = events.map(e =>
      e.id === ev.id ? { ...e, start: ev.start, end: ev.end } : e
    );
  }

  function handleEventResize(info: any) {
    const ev = info.event;
    addLog(`Resized "${ev.title}" → ends ${new Date(ev.end).toLocaleTimeString()}`);
    events = events.map(e =>
      e.id === ev.id ? { ...e, start: ev.start, end: ev.end } : e
    );
  }

  function handleDateClick(info: any) {
    const id = String(nextId++);
    const start = info.dateStr ?? info.date?.toISOString();
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 30 * 60000);
    const newEvent: ECEvent = {
      id,
      title: 'New task',
      start: startDate.toISOString().slice(0, 19),
      end: endDate.toISOString().slice(0, 19),
      extendedProps: { kind: 'task' }
    };
    events = [...events, newEvent];
    addLog(`Created task at ${startDate.toLocaleTimeString()}`);
  }

  function handleEventRemove(id: string) {
    const ev = events.find(e => e.id === id);
    events = events.filter(e => e.id !== id);
    addLog(`Removed "${ev?.title ?? id}"`);
  }
</script>

<div class="preview">
  <div class="info">
    <h1>Day Column Widget</h1>
    <p>Prototype preview. Interact with the panel on the right.</p>

    <div class="actions">
      <h2>Try it</h2>
      <ul>
        <li><strong>Drag</strong> an event up/down to move it</li>
        <li><strong>Drag the bottom edge</strong> of an event to resize</li>
        <li><strong>Click empty space</strong> to create a new 30-min task</li>
        <li><strong>Hover + ×</strong> to remove an event</li>
        <li>Notice <strong>overlap handling</strong> on events 5 & 6 (2:00 PM)</li>
        <li>Notice <strong>short events</strong> (≤30 min) clip the time text</li>
        <li><span class="swatch task"></span> = task (dashed border)</li>
        <li><span class="swatch event"></span> = calendar event (solid border)</li>
      </ul>
    </div>

    {#if log.length > 0}
      <div class="log">
        <h2>Event log</h2>
        {#each log as entry}
          <div class="log-entry">{entry}</div>
        {/each}
      </div>
    {/if}
  </div>
</div>

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
  .preview {
    padding: 3rem;
    max-width: 40rem;
  }

  h1 {
    font-size: 1.4rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  p {
    color: var(--tr-ink-soft);
    margin: 0 0 2rem;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--tr-ink-soft);
    margin: 0 0 0.75rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem;
  }
  ul li {
    padding: 0.25rem 0;
    font-size: 0.9rem;
    color: var(--tr-ink);
    border-bottom: 1px solid var(--tr-line);
  }

  .swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    vertical-align: middle;
    margin-right: 4px;
  }
  .swatch.task {
    background: rgba(26, 58, 42, 0.8);
    border-left: 3px dashed #50a070;
  }
  .swatch.event {
    background: #1e3a5f;
    border-left: 3px solid #5090d0;
  }

  .log {
    border-top: 1px solid var(--tr-line);
    padding-top: 1rem;
  }
  .log-entry {
    font-size: 0.8rem;
    color: var(--tr-ink-soft);
    padding: 0.15rem 0;
    font-family: 'Consolas', monospace;
  }
</style>
