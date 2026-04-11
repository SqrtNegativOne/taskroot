<!--
  ClarifyScreen — second phase. Tasks captured earlier are presented
  one at a time. The user reviews and fills in optional fields. A
  single keypress should be enough to accept defaults and move on.

  Props (data in):
    task         Task | null        the task currently being clarified;
                                    null means the queue is empty
    remaining    number             how many tasks are left (for a
                                    progress hint in the header)

  Events (actions out, via callback props):
    onUpdate(patch)  user edited the task; patch is a partial Task
                     containing only the fields that changed
    onAccept()       user pressed Enter to accept and move to the next
                     task in the queue
    onSkip()         user asked to skip this task (stays in queue)
    onAdvance()      user asked to move to the Plan phase

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  import type { Task } from '$lib/types';

  type Props = {
    task: Task | null;
    remaining: number;
    onUpdate: (patch: Partial<Task>) => void;
    onAccept: () => void;
    onSkip: () => void;
    onAdvance: () => void;
  };

  let { task, remaining, onUpdate, onAccept, onSkip, onAdvance }: Props =
    $props();

  function setLowThought(value: boolean) {
    onUpdate({ is_low_thought: value });
  }

  function setDuration(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const minutes = raw === '' ? null : Number(raw);
    onUpdate({ expected_duration: minutes });
  }

  function setWorkDate(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    onUpdate({ work_date: raw === '' ? null : raw });
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      onAccept();
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<section class="clarify">
  <header>
    <span class="phase-label">clarify</span>
    <span class="meta">{remaining} remaining</span>
    <button type="button" class="advance" onclick={onAdvance} aria-label="Advance to Plan phase">›</button>
  </header>

  {#if task === null}
    <p class="empty">Nothing left to clarify.</p>
  {:else}
    <article>
      <h2 class="name">{task.name}</h2>

      <div class="row">
        <label>
          Low-thought?
          <div class="toggle">
            <button
              type="button"
              class:selected={task.is_low_thought === true}
              onclick={() => setLowThought(true)}
            >
              yes
            </button>
            <button
              type="button"
              class:selected={task.is_low_thought === false}
              onclick={() => setLowThought(false)}
            >
              no
            </button>
          </div>
        </label>
      </div>

      <div class="row">
        <label>
          Expected duration (minutes)
          <input
            type="number"
            min="1"
            value={task.expected_duration ?? ''}
            oninput={setDuration}
          />
        </label>
      </div>

      <div class="row">
        <label>
          Work date
          <input type="date" value={task.work_date ?? ''} oninput={setWorkDate} />
        </label>
      </div>

      <div class="actions">
        <button type="button" class="skip" onclick={onSkip}>Skip</button>
        <button type="button" class="accept" onclick={onAccept}>
          Accept (Enter)
        </button>
      </div>
    </article>
  {/if}
</section>

<style>
  .clarify {
    padding: 4rem;
    max-width: 40rem;
    margin: 0 auto;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .phase-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--tr-ink-soft);
    flex: 1;
  }
  .meta {
    color: var(--tr-ink-soft);
    font-size: 0.85rem;
  }
  .advance {
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
  .empty {
    color: var(--tr-ink-soft);
  }
  .name {
    font-weight: 400;
    font-size: 1.5rem;
    margin: 0 0 2rem;
  }
  .row {
    margin: 1.25rem 0;
  }
  .row label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--tr-ink-soft);
  }
  .row input[type='number'],
  .row input[type='date'] {
    padding: 0.5rem 0;
    font-size: 1rem;
    border: none;
    border-bottom: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    outline: none;
  }
  .row input:focus {
    border-bottom-color: var(--tr-ink);
  }
  .toggle {
    display: inline-flex;
    gap: 0.5rem;
  }
  .toggle button {
    border: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink-soft);
    padding: 0.35rem 0.9rem;
    cursor: pointer;
    font: inherit;
    border-radius: 999px;
  }
  .toggle button.selected {
    background: var(--tr-ink);
    border-color: var(--tr-ink);
    color: var(--tr-bg);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 3rem;
  }
  .actions button {
    padding: 0.55rem 1.3rem;
    border: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    cursor: pointer;
    font: inherit;
  }
  .actions .accept {
    background: var(--tr-ink);
    color: var(--tr-bg);
    border-color: var(--tr-ink);
  }
</style>
