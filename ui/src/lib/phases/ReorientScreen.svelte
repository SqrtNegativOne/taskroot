<!--
  ReorientScreen — accessible at any point after the day is initialised.
  The most comprehensive screen in the app; contains calendar views,
  statistics, settings, and an inline capture re-entry.

  Per plan.txt the full layout is [OPEN] — this is a first-pass stub
  with clearly labelled sections. Fill them in as the design solidifies.

  Props (data in):
    tasks            Task[]           all tasks (any date)
    events           CalendarEvent[]  all events
    stats            Record<string,   freeform statistics map; orchestrator
                     string|number>   is free to add/rename keys

  Events:
    onClose()                      dismiss and return to Do
    onInlineCapture(name)          add a task via the inline field
    onOpenSettings()               open the settings subscreen (not
                                   yet implemented; stub today)

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  import type { CalendarEvent, Task } from '$lib/types';

  type StatValue = string | number;

  type Props = {
    tasks: Task[];
    events: CalendarEvent[];
    stats: Record<string, StatValue>;
    onClose: () => void;
    onInlineCapture: (name: string) => void;
    onOpenSettings: () => void;
  };

  let { tasks, events, stats, onClose, onInlineCapture, onOpenSettings }:
    Props = $props();

  let inlineDraft = $state('');

  function handleInlineKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && inlineDraft.trim().length > 0) {
      event.preventDefault();
      onInlineCapture(inlineDraft.trim());
      inlineDraft = '';
    }
  }

  const statEntries = $derived(Object.entries(stats));
</script>

<section class="reorient">
  <header>
    <h1>Reorient</h1>
    <button type="button" class="close" onclick={onClose}>✕</button>
  </header>

  <div class="grid">
    <section class="panel">
      <h2>Inline capture</h2>
      <input
        type="text"
        class="field"
        placeholder="Add a task…"
        bind:value={inlineDraft}
        onkeydown={handleInlineKey}
      />
    </section>

    <section class="panel">
      <h2>Month / week / day</h2>
      <p class="stub">
        Calendar views live here. {events.length} event(s),
        {tasks.length} task(s).
      </p>
    </section>

    <section class="panel">
      <h2>Statistics</h2>
      {#if statEntries.length === 0}
        <p class="stub">No statistics yet. [plan.txt: open question]</p>
      {:else}
        <dl>
          {#each statEntries as [key, value]}
            <dt>{key}</dt>
            <dd>{value}</dd>
          {/each}
        </dl>
      {/if}
    </section>

    <section class="panel">
      <h2>Settings</h2>
      <button type="button" class="secondary" onclick={onOpenSettings}>
        Open settings…
      </button>
    </section>
  </div>
</section>

<style>
  .reorient {
    padding: 2.5rem 3rem;
  }
  header {
    display: flex;
    align-items: baseline;
    margin-bottom: 2rem;
  }
  h1 {
    font-weight: 300;
    margin: 0;
    flex: 1;
  }
  .close {
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    cursor: pointer;
    font-size: 1.2rem;
  }
  .close:hover {
    color: var(--tr-ink);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .panel {
    border: 1px solid var(--tr-line);
    padding: 1.5rem;
  }
  .panel h2 {
    margin: 0 0 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--tr-ink-soft);
  }
  .field {
    width: 100%;
    padding: 0.6rem 0;
    font: inherit;
    border: none;
    border-bottom: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    outline: none;
  }
  .stub {
    color: var(--tr-ink-soft);
    margin: 0;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 1rem;
    margin: 0;
  }
  dt {
    color: var(--tr-ink-soft);
    text-transform: capitalize;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .secondary {
    background: none;
    border: 1px solid var(--tr-line);
    color: var(--tr-ink);
    padding: 0.4rem 1rem;
    cursor: pointer;
    font: inherit;
  }
</style>
