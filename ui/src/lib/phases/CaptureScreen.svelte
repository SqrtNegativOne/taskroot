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

  const hasSuggestions = $derived(draft.length > 0 && suggestions.length > 0);
</script>

<section class="capture">
  <button type="button" class="advance" onclick={onAdvance} aria-label="Advance to next phase">
    ›
  </button>

  <div class="center">
    <div class="input-wrap">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="field"
        type="text"
        placeholder="Add a task…"
        value={draft}
        oninput={handleInput}
        onkeydown={handleKey}
        autofocus
      />
      <div class="line"></div>
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {#if hasSuggestions}
      <ul class="suggestions" role="listbox" aria-label="Similar existing tasks">
        {#each suggestions as s (s.task.id)}
          <li role="option" aria-selected="false">{s.task.name}</li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  .capture {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
  }

  .advance {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    background: none;
    border: none;
    color: var(--tr-ink-soft);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem 0.4rem;
    transition: color 100ms ease;
  }
  .advance:hover {
    color: var(--tr-ink);
  }
  .advance:focus-visible {
    outline: 2px solid var(--tr-accent);
    outline-offset: 2px;
    color: var(--tr-ink);
  }

  .center {
    width: 100%;
    max-width: 34rem;
    position: relative;
  }

  .field {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--tr-ink);
    font: inherit;
    font-size: 1.05rem;
    text-align: center;
    padding: 0.5rem 2rem 0.65rem;
    display: block;
    caret-color: var(--tr-ink-soft);
  }

  .line {
    height: 1px;
    margin: 0 auto;
    width: 52%;
    background: linear-gradient(
      to right,
      transparent,
      var(--tr-ink-soft) 20%,
      var(--tr-ink-soft) 80%,
      transparent
    );
    transition:
      width 280ms ease,
      background 180ms ease;
  }

  .input-wrap:focus-within .line {
    width: 88%;
    background: linear-gradient(
      to right,
      transparent,
      var(--tr-ink) 10%,
      var(--tr-ink) 90%,
      transparent
    );
  }

  .error {
    text-align: center;
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--tr-error);
  }

  /* Absolutely positioned so they never push the input upward */
  .suggestions {
    position: absolute;
    top: calc(100% + 1.25rem);
    left: 0;
    right: 0;
    list-style: none;
    padding: 0;
    margin: 0;
    animation: suggestion-fade 220ms ease forwards;
  }

  @keyframes suggestion-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .suggestions li {
    padding: 0.4rem 0;
    font-size: 0.875rem;
    color: var(--tr-ink-soft);
    text-align: center;
    border-bottom: 1px solid var(--tr-line);
  }
  .suggestions li:last-child {
    border-bottom: none;
  }
</style>
