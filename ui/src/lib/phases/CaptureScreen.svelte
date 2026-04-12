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

  Events (actions out):
    onQueryChange(query)     user typed; orchestrator may debounce and
                             call similarTasks under the hood
    onCapture(parsed)        user pressed Enter; carries the parsed fields
                             so the orchestrator doesn't need to re-parse
    onAdvance()              user asked to move to the Clarify phase

  This component is pure. It does not know what a "backend" is.
-->
<script lang="ts">
  import type { Suggestion } from '$lib/types';
  import SmartInput from '$lib/smart-input/SmartInput.svelte';
  import { parseTask, type Token } from '$lib/smart-input/parser';

  export type CaptureResult = {
    name: string;
    work_date: string | null;
    deadline: string | null;
    expected_duration: number | null;
    is_low_thought: boolean | null;
  };

  type Props = {
    suggestions: Suggestion[];
    error: string | null;
    onQueryChange: (query: string) => void;
    onCapture: (result: CaptureResult) => void;
    onAdvance: () => void;
  };

  let { suggestions, error, onQueryChange, onCapture, onAdvance }: Props =
    $props();

  let draft = $state('');
  let suppressed = $state<Array<{ start: number; end: number }>>([]);

  let parsed = $derived(parseTask(draft, { suppress: suppressed }));
  let tokens = $derived(parsed.tokens);

  const hasSuggestions = $derived(draft.length > 0 && suggestions.length > 0);

  function handleInput(value: string) {
    draft = value;
    // If the user edits text, clear suppressed spans that no longer make
    // sense (simplest heuristic: reset on every edit).
    suppressed = [];
    onQueryChange(value);
  }

  function handleCommit(value: string) {
    if (value.trim().length === 0) return;

    function tokenValue<T>(type: string): T | null {
      const tok = tokens.find((t: Token) => t.type === type);
      return tok ? (tok.value as T) : null;
    }

    onCapture({
      name: parsed.title || value.trim(),
      work_date: tokenValue<string>('work_date'),
      deadline: tokenValue<string>('deadline'),
      expected_duration: tokenValue<number>('duration'),
      is_low_thought: tokenValue<boolean>('low_thought'),
    });

    draft = '';
    suppressed = [];
  }

  function handleSuppress(start: number, end: number) {
    suppressed = [...suppressed, { start, end }];
  }
</script>

<section class="capture">
  <button type="button" class="advance" onclick={onAdvance} aria-label="Advance to next phase">
    ›
  </button>

  <div class="center">
    <div class="input-wrap">
      <SmartInput
        value={draft}
        {tokens}
        suppress={suppressed}
        onInput={handleInput}
        onCommit={handleCommit}
        onSuppress={handleSuppress}
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

  .input-wrap {
    position: relative;
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
