<!--
  CaptureScreen — the first phase of the day. The user adds tasks and
  events freely; the only mandatory field is the name.

  Props (data in):
    suggestions  Suggestion[]       similar existing tasks for the
                                    current query, re-sent by the
                                    orchestrator when it debounces
                                    onQueryChange
    error        string | null      inline validation error to show
                                    (e.g. "Task must begin with a verb")

  Events (actions out, via callback props):
    onQueryChange(query)  user typed; orchestrator may debounce and
                          call similarTasks under the hood
    onCapture(name)       user pressed Enter to capture the task
    onAdvance()           user asked to move to the Clarify phase

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  import type { Suggestion } from '$lib/types';

  type Props = {
    suggestions: Suggestion[];
    error: string | null;
    onQueryChange: (query: string) => void;
    onCapture: (name: string) => void;
    onAdvance: () => void;
  };

  let { suggestions, error, onQueryChange, onCapture, onAdvance }: Props =
    $props();

  let draft = $state('');

  function handleInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    draft = value;
    onQueryChange(value);
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && draft.trim().length > 0) {
      event.preventDefault();
      onCapture(draft.trim());
      draft = '';
    }
  }
</script>

<section class="capture">
  <header>
    <h1>Capture</h1>
    <button type="button" class="advance" onclick={onAdvance}>
      Advance →
    </button>
  </header>

  <input
    class="field"
    type="text"
    placeholder="Add a task (start with a verb)…"
    value={draft}
    oninput={handleInput}
    onkeydown={handleKey}
    autofocus
  />

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if suggestions.length > 0}
    <aside class="suggestions">
      <h2>Similar existing tasks</h2>
      <ul>
        {#each suggestions as s (s.task.id)}
          <li>{s.task.name}</li>
        {/each}
      </ul>
    </aside>
  {/if}
</section>

<style>
  .capture {
    padding: 4rem;
    max-width: 42rem;
    margin: 0 auto;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2rem;
  }
  h1 {
    font-weight: 300;
    letter-spacing: 0.02em;
    margin: 0;
  }
  .advance {
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    cursor: pointer;
    font: inherit;
  }
  .advance:hover {
    color: var(--tr-ink);
  }
  .field {
    width: 100%;
    padding: 1rem 0;
    font-size: 1.25rem;
    border: none;
    border-bottom: 1px solid var(--tr-line);
    background: transparent;
    color: var(--tr-ink);
    outline: none;
  }
  .field:focus {
    border-bottom-color: var(--tr-ink);
  }
  .error {
    color: var(--tr-error);
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }
  .suggestions {
    margin-top: 2.5rem;
    color: var(--tr-ink-soft);
  }
  .suggestions h2 {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0 0 0.5rem;
  }
  .suggestions ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .suggestions li {
    padding: 0.25rem 0;
  }
</style>
