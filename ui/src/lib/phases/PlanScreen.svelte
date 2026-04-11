<!--
  PlanScreen — third phase. A month calendar plus a "today" split view
  showing low-thought vs thought-intensive tasks side by side.

  Props (data in):
    monthStart       ISODate         the first day of the month being
                                     displayed
    events           CalendarEvent[] events starting inside the month
    tasks            Task[]          tasks with work_date or deadline
                                     inside the month
    todayTasks       Task[]          tasks whose work_date is today;
                                     split into two lists inside this
                                     component by is_low_thought
    showRecurring    boolean         whether to show projected
                                     recurring instances in the cells

  Events:
    onNavigateMonth(delta)   -1 for previous, +1 for next
    onToggleRecurring()      flip showRecurring
    onAdvance()              move to Do phase

  This component is pure. The calendar is a minimal month-grid stub;
  extend it freely — the agent modifying this file should only need
  this file and `$lib/types`.
-->
<script lang="ts">
  import type { CalendarEvent, ISODate, Task } from '$lib/types';

  type Props = {
    monthStart: ISODate;
    events: CalendarEvent[];
    tasks: Task[];
    todayTasks: Task[];
    showRecurring: boolean;
    onNavigateMonth: (delta: -1 | 1) => void;
    onToggleRecurring: () => void;
    onAdvance: () => void;
  };

  let {
    monthStart,
    events,
    tasks,
    todayTasks,
    showRecurring,
    onNavigateMonth,
    onToggleRecurring,
    onAdvance
  }: Props = $props();

  const monthName = $derived(
    new Date(monthStart).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    })
  );

  const today = new Date().toISOString().slice(0, 10);

  const lowThought = $derived(todayTasks.filter((t) => t.is_low_thought === true));
  const thoughtful = $derived(
    todayTasks.filter((t) => t.is_low_thought !== true)
  );

  const monthGrid = $derived(buildMonthGrid(monthStart));

  function buildMonthGrid(start: ISODate): ISODate[][] {
    const first = new Date(start);
    first.setUTCDate(1);
    const offset = (first.getUTCDay() + 6) % 7; // Monday-first
    first.setUTCDate(first.getUTCDate() - offset);
    const weeks: ISODate[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: ISODate[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(first);
        cell.setUTCDate(first.getUTCDate() + w * 7 + d);
        row.push(cell.toISOString().slice(0, 10));
      }
      weeks.push(row);
    }
    return weeks;
  }

  function tasksOn(day: ISODate): Task[] {
    return tasks.filter((t) => t.work_date === day || t.deadline === day);
  }

  function eventsOn(day: ISODate): CalendarEvent[] {
    return events.filter((e) => e.start.slice(0, 10) === day);
  }
</script>

<section class="plan">
  <header>
    <button type="button" class="nav-btn" onclick={() => onNavigateMonth(-1)} aria-label="Previous month">‹</button>
    <span class="month">{monthName}</span>
    <button type="button" class="nav-btn" onclick={() => onNavigateMonth(1)} aria-label="Next month">›</button>
    <label class="recurring" title="Show projected recurring tasks">
      <input
        type="checkbox"
        checked={showRecurring}
        onchange={onToggleRecurring}
      />
      recurring
    </label>
    <button type="button" class="advance" onclick={onAdvance} aria-label="Advance to Do phase">›</button>
  </header>

  <div class="calendar">
    <div class="weekdays">
      {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as d}
        <span>{d}</span>
      {/each}
    </div>
    {#each monthGrid as week}
      <div class="week">
        {#each week as day (day)}
          {@const dayTasks = tasksOn(day)}
          {@const dayEvents = eventsOn(day)}
          <div class="cell" class:is-today={day === today}>
            <span class="num">{Number(day.slice(-2))}</span>
            {#each dayEvents as e (e.id)}
              <span class="chip event">{e.name}</span>
            {/each}
            {#each dayTasks as t (t.id)}
              <span class="chip task">{t.name}</span>
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="today">
    <section>
      <h2>Low-thought</h2>
      {#if lowThought.length === 0}
        <p class="empty">—</p>
      {:else}
        <ul>
          {#each lowThought as t (t.id)}
            <li>{t.name}</li>
          {/each}
        </ul>
      {/if}
    </section>
    <section>
      <h2>Thought-intensive</h2>
      {#if thoughtful.length === 0}
        <p class="empty">—</p>
      {:else}
        <ul>
          {#each thoughtful as t (t.id)}
            <li>{t.name}</li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</section>

<style>
  .plan {
    padding: 2rem 2.5rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .nav-btn {
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    cursor: pointer;
    font-size: 1.3rem;
    line-height: 1;
    padding: 0.1rem 0.3rem;
    transition: color 100ms ease;
  }
  .nav-btn:hover {
    color: var(--tr-ink);
  }
  .month {
    font-size: 0.85rem;
    color: var(--tr-ink-soft);
    min-width: 9rem;
    text-align: center;
  }
  .recurring {
    font-size: 0.75rem;
    color: var(--tr-ink-soft);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: 0.5rem;
  }
  .advance {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    cursor: pointer;
    font-size: 1.4rem;
    line-height: 1;
    padding: 0.1rem 0.25rem;
    transition: color 100ms ease;
  }
  .advance:hover {
    color: var(--tr-ink);
  }

  .calendar {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--tr-line);
    border: 1px solid var(--tr-line);
  }
  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: var(--tr-bg);
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
    color: var(--tr-ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--tr-line);
  }
  .cell {
    background: var(--tr-bg);
    min-height: 4.5rem;
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .cell.is-today {
    background: var(--tr-surface);
  }
  .cell.is-today .num {
    color: var(--tr-ink);
    font-weight: 600;
  }
  .cell .num {
    color: var(--tr-ink-soft);
    font-size: 0.7rem;
  }
  .chip {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 0.7rem;
  }
  .chip.task {
    background: var(--tr-line);
    color: var(--tr-ink);
  }
  .chip.event {
    background: var(--tr-ink);
    color: var(--tr-bg);
  }

  .today {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-top: 2.5rem;
  }
  .today h2 {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--tr-ink-soft);
    margin: 0 0 0.5rem;
  }
  .today ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .today li {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--tr-line);
  }
  .today .empty {
    color: var(--tr-ink-soft);
    margin: 0;
  }
</style>
