<!--
  ShutdownScreen — the final phase, triggered explicitly by the user.

  Layout per plan.txt (in order):
    1. Day visualisation (timeline from TimeSession records)
    2. Task table (est / actual per task)
    3. Impact rating (1-5 stars)
    4. Focus summary (minutes with active session, total)
    5. Reflection notes (four text fields)

  Props (data in):
    timelineEntries    TimelineEntry[]   pre-computed blocks for the
                                         day viz (start/end/label)
    taskRows           TaskRow[]         est + actual minutes per task
    focus              { active: number, total: number }
    ritual             RitualState       the current draft of reflection
                                         answers and the rating

  Events:
    onRitualChange(patch)    partial update of the ritual draft;
                             orchestrator persists if/when it chooses
    onFinish()               user committed and wants the day closed
    onCancel()               user backed out, return to Do

  RitualState is kept local-only per plan.txt: "only the ritual data
  is lost" if the app dies mid-shutdown. The orchestrator decides when
  to persist.

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  export type TimelineEntry = {
    id: string;
    label: string;
    start: string; // ISO
    end: string; // ISO
    kind: 'task' | 'break' | 'event';
  };

  export type TaskRow = {
    id: string;
    name: string;
    expected_minutes: number | null;
    actual_minutes: number;
  };

  export type RitualState = {
    rating: number; // 0 = unset, 1..5 otherwise
    worked_on: string;
    worked_well: string;
    worked_poorly: string;
    change_tomorrow: string;
  };

  type Props = {
    timelineEntries: TimelineEntry[];
    taskRows: TaskRow[];
    focus: { active: number; total: number };
    ritual: RitualState;
    onRitualChange: (patch: Partial<RitualState>) => void;
    onFinish: () => void;
    onCancel: () => void;
  };

  let { timelineEntries, taskRows, focus, ritual, onRitualChange, onFinish, onCancel }:
    Props = $props();

  function setRating(value: number) {
    onRitualChange({ rating: value });
  }

  function bindField(key: keyof RitualState) {
    return (event: Event) => {
      const value = (event.target as HTMLTextAreaElement).value;
      onRitualChange({ [key]: value } as Partial<RitualState>);
    };
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<section class="shutdown">
  <header>
    <span class="phase-label">shutdown</span>
    <button type="button" class="close" onclick={onCancel} aria-label="Cancel shutdown">×</button>
  </header>

  <section class="block">
    <h2>Day visualisation</h2>
    {#if timelineEntries.length === 0}
      <p class="empty">No tracked activity today.</p>
    {:else}
      <ol class="timeline">
        {#each timelineEntries as entry (entry.id)}
          <li class="timeline-row kind-{entry.kind}">
            <span class="bar"></span>
            <span class="time">{formatTime(entry.start)} — {formatTime(entry.end)}</span>
            <span class="label">{entry.label}</span>
          </li>
        {/each}
      </ol>
    {/if}
  </section>

  <section class="block">
    <h2>Tasks</h2>
    {#if taskRows.length === 0}
      <p class="empty">No tasks touched today.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Est</th>
            <th>Actual</th>
          </tr>
        </thead>
        <tbody>
          {#each taskRows as row (row.id)}
            <tr>
              <td>{row.name}</td>
              <td>{row.expected_minutes ?? '—'}</td>
              <td>{row.actual_minutes}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <section class="block">
    <h2>Impact</h2>
    <div class="stars">
      {#each [1, 2, 3, 4, 5] as n}
        <button
          type="button"
          class:filled={ritual.rating >= n}
          onclick={() => setRating(n)}
          aria-label={`Rate ${n}`}
        >
          ★
        </button>
      {/each}
    </div>
  </section>

  <section class="block">
    <h2>Focus</h2>
    <p class="focus">
      Active session: <strong>{focus.active} min</strong> ·
      Total work: <strong>{focus.total} min</strong>
    </p>
  </section>

  <section class="block">
    <h2>Reflection</h2>
    <label>
      What did you work on today?
      <textarea rows="3" value={ritual.worked_on} oninput={bindField('worked_on')}></textarea>
    </label>
    <label>
      What worked well?
      <textarea rows="3" value={ritual.worked_well} oninput={bindField('worked_well')}></textarea>
    </label>
    <label>
      What didn't work well?
      <textarea rows="3" value={ritual.worked_poorly} oninput={bindField('worked_poorly')}></textarea>
    </label>
    <label>
      What should change tomorrow?
      <textarea rows="3" value={ritual.change_tomorrow} oninput={bindField('change_tomorrow')}></textarea>
    </label>
  </section>

  <footer>
    <button type="button" class="finish" onclick={onFinish}>Finish day</button>
  </footer>
</section>

<style>
  .shutdown {
    padding: 2.5rem 3rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  header {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
  }
  .phase-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--tr-ink-soft);
    flex: 1;
  }
  .close {
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0.1rem 0.25rem;
    transition: color 100ms ease;
  }
  .close:hover {
    color: var(--tr-ink);
  }
  .block {
    margin-bottom: 2.5rem;
  }
  .block h2 {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--tr-ink-soft);
    margin: 0 0 0.75rem;
  }
  .empty {
    color: var(--tr-ink-soft);
  }
  .timeline {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .timeline-row {
    display: grid;
    grid-template-columns: 4px 8rem 1fr;
    gap: 0.75rem;
    padding: 0.35rem 0;
    align-items: center;
  }
  .timeline-row .bar {
    height: 1rem;
    background: var(--tr-ink-soft);
  }
  .timeline-row.kind-task .bar {
    background: var(--tr-ink);
  }
  .timeline-row.kind-event .bar {
    background: #5a6ac0;
  }
  .time {
    font-size: 0.8rem;
    color: var(--tr-ink-soft);
    font-variant-numeric: tabular-nums;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--tr-line);
  }
  th {
    font-weight: 500;
    color: var(--tr-ink-soft);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  td:nth-child(2),
  td:nth-child(3),
  th:nth-child(2),
  th:nth-child(3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
    width: 5rem;
  }
  .stars {
    display: flex;
    gap: 0.25rem;
    font-size: 1.5rem;
  }
  .stars button {
    background: none;
    border: none;
    color: var(--tr-line);
    cursor: pointer;
    padding: 0.1rem 0.2rem;
  }
  .stars button.filled {
    color: var(--tr-ink);
  }
  .focus strong {
    color: var(--tr-ink);
  }
  label {
    display: block;
    margin: 1rem 0;
    font-size: 0.85rem;
    color: var(--tr-ink-soft);
  }
  label textarea {
    display: block;
    width: 100%;
    margin-top: 0.35rem;
    padding: 0.5rem;
    border: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    font: inherit;
    outline: none;
    resize: vertical;
  }
  label textarea:focus {
    border-color: var(--tr-ink);
  }
  footer {
    text-align: right;
  }
  .finish {
    background: var(--tr-ink);
    color: var(--tr-bg);
    border: none;
    padding: 0.6rem 1.4rem;
    cursor: pointer;
    font: inherit;
  }
</style>
