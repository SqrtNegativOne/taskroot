<!--
  DoScreen — fourth and longest-lived phase. The user actually works.

  This is the most feature-dense screen in the app per plan.txt.
  Everything here is stubbed as a collapsible section so an agent
  modifying it can drop in richer content one region at a time
  without touching the others.

  Props (data in):
    lowThoughtTasks    Task[]        task list A (breaks / downtime)
    thoughtfulTasks    Task[]        task list B (focused work)
    activeSession      TimeSession   the running session, or null
                       | null
    activeTask         Task | null   the task the session belongs to,
                                     resolved by the orchestrator for
                                     display convenience
    distractions       Distraction[] distractions logged today
    notePad            string        today's plain-text notes
    persistentText     string        the across-days text area

  Events:
    onStartTimer(taskId)       begin a session on the given task
    onStopTimer()              stop the active session
    onLogDistraction(text)     save a distraction entry
    onNotePadChange(text)      note-pad was edited
    onPersistentChange(text)   persistent text was edited
    onReorient()               open the Reorient screen
    onShutdown()               advance to the Shutdown phase

  Deliberately not modelled yet: music player, calculator, break-type
  buttons, Obsidian link list. Add those when ready — the contract can
  grow.

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  import type { Distraction, Task, TimeSession } from '$lib/types';

  type Props = {
    lowThoughtTasks: Task[];
    thoughtfulTasks: Task[];
    activeSession: TimeSession | null;
    activeTask: Task | null;
    distractions: Distraction[];
    notePad: string;
    persistentText: string;
    onStartTimer: (taskId: string) => void;
    onStopTimer: () => void;
    onLogDistraction: (text: string) => void;
    onNotePadChange: (text: string) => void;
    onPersistentChange: (text: string) => void;
    onReorient: () => void;
    onShutdown: () => void;
  };

  let {
    lowThoughtTasks,
    thoughtfulTasks,
    activeSession,
    activeTask,
    distractions,
    notePad,
    persistentText,
    onStartTimer,
    onStopTimer,
    onLogDistraction,
    onNotePadChange,
    onPersistentChange,
    onReorient,
    onShutdown
  }: Props = $props();

  let open = $state({
    tasks: true,
    timer: true,
    distractions: true,
    notes: false,
    persistent: false
  });

  let distractionDraft = $state('');

  function toggle(key: keyof typeof open) {
    open[key] = !open[key];
  }

  function handleDistractionKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && distractionDraft.trim().length > 0) {
      event.preventDefault();
      onLogDistraction(distractionDraft.trim());
      distractionDraft = '';
    }
  }

  const elapsedMinutes = $derived(
    activeSession
      ? Math.floor(
          (Date.now() - new Date(activeSession.started_at).getTime()) / 60000
        )
      : 0
  );
</script>

<section class="do">
  <header>
    <h1>Do</h1>
    <button type="button" class="secondary" onclick={onReorient}>
      Reorient
    </button>
    <button type="button" class="secondary" onclick={onShutdown}>
      Shutdown
    </button>
  </header>

  <!-- TASK LISTS -->
  <details class="block" open={open.tasks} ontoggle={() => toggle('tasks')}>
    <summary>Tasks</summary>
    <div class="two-col">
      <div>
        <h2>Low-thought</h2>
        {#if lowThoughtTasks.length === 0}
          <p class="empty">—</p>
        {:else}
          <ul class="tasks">
            {#each lowThoughtTasks as t (t.id)}
              <li>
                <button type="button" onclick={() => onStartTimer(t.id)}>
                  ▶
                </button>
                <span>{t.name}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      <div>
        <h2>Thought-intensive</h2>
        {#if thoughtfulTasks.length === 0}
          <p class="empty">—</p>
        {:else}
          <ul class="tasks">
            {#each thoughtfulTasks as t (t.id)}
              <li>
                <button type="button" onclick={() => onStartTimer(t.id)}>
                  ▶
                </button>
                <span>{t.name}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </details>

  <!-- TIMER -->
  <details class="block" open={open.timer} ontoggle={() => toggle('timer')}>
    <summary>Timer</summary>
    {#if activeSession && activeTask}
      <p class="timer">
        <span class="task-name">{activeTask.name}</span>
        <span class="elapsed">{elapsedMinutes} min</span>
        <button type="button" onclick={onStopTimer}>Stop</button>
      </p>
    {:else}
      <p class="empty">No task active.</p>
    {/if}
  </details>

  <!-- DISTRACTIONS -->
  <details
    class="block"
    open={open.distractions}
    ontoggle={() => toggle('distractions')}
  >
    <summary>Distraction inventory</summary>
    <input
      type="text"
      class="field"
      placeholder="What pulled you away?"
      bind:value={distractionDraft}
      onkeydown={handleDistractionKey}
    />
    {#if distractions.length > 0}
      <ul class="distractions">
        {#each distractions as d (d.id)}
          <li>{d.text}</li>
        {/each}
      </ul>
    {/if}
  </details>

  <!-- NOTES -->
  <details class="block" open={open.notes} ontoggle={() => toggle('notes')}>
    <summary>Notes (today)</summary>
    <textarea
      rows="5"
      class="field"
      value={notePad}
      oninput={(e) => onNotePadChange((e.target as HTMLTextAreaElement).value)}
    ></textarea>
  </details>

  <!-- PERSISTENT -->
  <details
    class="block"
    open={open.persistent}
    ontoggle={() => toggle('persistent')}
  >
    <summary>Persistent text</summary>
    <textarea
      rows="5"
      class="field"
      value={persistentText}
      oninput={(e) =>
        onPersistentChange((e.target as HTMLTextAreaElement).value)}
    ></textarea>
  </details>
</section>

<style>
  .do {
    padding: 2.5rem 3rem;
    max-width: 60rem;
    margin: 0 auto;
  }
  header {
    display: flex;
    gap: 1rem;
    align-items: baseline;
    margin-bottom: 2rem;
  }
  h1 {
    font-weight: 300;
    margin: 0;
    flex: 1;
  }
  .secondary {
    background: none;
    border: 1px solid var(--tr-line);
    color: var(--tr-ink);
    padding: 0.35rem 0.85rem;
    cursor: pointer;
    font: inherit;
  }

  .block {
    border-top: 1px solid var(--tr-line);
    padding: 1rem 0;
  }
  .block summary {
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--tr-ink-soft);
    list-style: none;
  }
  .block summary::-webkit-details-marker {
    display: none;
  }
  .block[open] > summary {
    margin-bottom: 1rem;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
  .two-col h2 {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--tr-ink-soft);
    margin: 0 0 0.5rem;
  }

  .tasks {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .tasks li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--tr-line);
  }
  .tasks li button {
    background: none;
    border: 1px solid var(--tr-line);
    color: var(--tr-ink);
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    cursor: pointer;
  }

  .timer {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin: 0;
  }
  .timer .task-name {
    flex: 1;
  }
  .timer .elapsed {
    color: var(--tr-ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .timer button {
    background: var(--tr-ink);
    color: var(--tr-bg);
    border: none;
    padding: 0.4rem 1rem;
    cursor: pointer;
    font: inherit;
  }

  .field {
    width: 100%;
    padding: 0.6rem 0;
    font: inherit;
    font-size: 0.95rem;
    border: none;
    border-bottom: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    outline: none;
    resize: vertical;
  }
  .field:focus {
    border-bottom-color: var(--tr-ink);
  }

  .distractions {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0;
    color: var(--tr-ink-soft);
    font-size: 0.9rem;
  }
  .distractions li {
    padding: 0.2rem 0;
  }

  .empty {
    color: var(--tr-ink-soft);
    margin: 0;
  }
</style>
