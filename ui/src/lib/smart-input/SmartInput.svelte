<!--
  SmartInput — a single-line text input with real-time token highlighting.

  Uses the mirror-overlay technique: the real <input> has transparent text
  so the cursor/selection are still native, while an absolutely-positioned
  <div> behind it renders the same text with <span> highlights around parsed
  tokens. The mirror must have identical font metrics or the text won't align.

  Props (data in):
    value       string        controlled value
    placeholder string        placeholder text (default "Add a task…")
    tokens      Token[]       parsed tokens from parseTask(); controls highlight spans
    suppress    {start,end}[] ranges the user has dismissed — passed back through
                              onSuppress so the parent can re-run the parser

  Events (actions out):
    onInput(value)            user changed the text
    onCommit(value)           user pressed Enter
    onSuppress(start, end)    user clicked a highlight to dismiss it
-->
<script lang="ts">
  import type { Token } from './parser';

  type SuppressedRange = { start: number; end: number };

  type Props = {
    value: string;
    placeholder?: string;
    tokens: Token[];
    suppress?: SuppressedRange[];
    onInput: (value: string) => void;
    onCommit: (value: string) => void;
    onSuppress?: (start: number, end: number) => void;
  };

  let {
    value,
    placeholder = 'Add a task…',
    tokens,
    suppress = [],
    onInput,
    onCommit,
    onSuppress,
  }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let mirrorEl = $state<HTMLDivElement | null>(null);

  // TOKEN_COLORS maps each token type to a CSS custom property name so the
  // palette lives in one place and can be overridden per-theme.
  const TOKEN_COLORS: Record<string, string> = {
    work_date: 'var(--si-date)',
    deadline: 'var(--si-deadline)',
    duration: 'var(--si-duration)',
    low_thought: 'var(--si-low)',
  };

  /**
   * Builds the mirror innerHTML by walking the sorted token list and
   * inserting <span> elements around each matched range. Characters outside
   * any token are emitted as plain text nodes (via a wrapper span with no
   * special class).
   */
  function buildMirrorHTML(raw: string, toks: Token[]): string {
    const sorted = [...toks].sort((a, b) => a.start - b.start);
    let html = '';
    let cursor = 0;

    for (const tok of sorted) {
      // plain text before this token
      if (tok.start > cursor) {
        html += escapeHTML(raw.slice(cursor, tok.start));
      }
      const color = TOKEN_COLORS[tok.type] ?? 'var(--si-date)';
      html +=
        `<span class="hi" style="color:${color}" ` +
        `data-start="${tok.start}" data-end="${tok.end}">` +
        escapeHTML(raw.slice(tok.start, tok.end)) +
        `</span>`;
      cursor = tok.end;
    }
    // remaining plain text
    if (cursor < raw.length) html += escapeHTML(raw.slice(cursor));
    return html;
  }

  function escapeHTML(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let mirrorHTML = $derived(buildMirrorHTML(value, tokens));

  function handleInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    syncScroll();
    onInput(v);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && value.trim().length > 0) {
      e.preventDefault();
      onCommit(value.trim());
    }
  }

  function handleMirrorClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('hi') && onSuppress) {
      const start = parseInt(target.dataset.start ?? '0', 10);
      const end = parseInt(target.dataset.end ?? '0', 10);
      onSuppress(start, end);
    }
  }

  function syncScroll() {
    if (inputEl && mirrorEl) {
      mirrorEl.scrollLeft = inputEl.scrollLeft;
    }
  }
</script>

<div class="si-wrapper">
  <!--
    Mirror sits behind the input. overflow:hidden + same padding as the input
    ensures the text renders in the exact same position.
  -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="si-mirror"
    aria-hidden="true"
    bind:this={mirrorEl}
    onclick={handleMirrorClick}
  >
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html mirrorHTML}
  </div>

  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="si-input"
    type="text"
    {placeholder}
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
    bind:this={inputEl}
    autofocus
  />
</div>

<style>
  /* Token colour palette — override via parent :global or CSS variables */
  :global(:root) {
    --si-date:     #7ab4e0;
    --si-deadline: #e07a7a;
    --si-duration: #a0c878;
    --si-low:      #b0a0d8;
  }

  .si-wrapper {
    position: relative;
    width: 100%;
  }

  /*
    Mirror and input must share identical font metrics.
    Use the same padding, font, line-height, and letter-spacing.
    The mirror's text-indent is irrelevant — we only need visual alignment.
  */
  .si-mirror,
  .si-input {
    font: inherit;
    font-size: 1.05rem;
    letter-spacing: inherit;
    padding: 0.5rem 2rem 0.65rem;
    white-space: pre;
    overflow: hidden;
    width: 100%;
    text-align: center;
  }

  .si-mirror {
    position: absolute;
    inset: 0;
    pointer-events: none; /* default: pass clicks to the real input */
    color: transparent; /* mirror text is invisible; only spans show */
    border: none;
    background: transparent;
    z-index: 0;
    line-height: inherit;
  }

  /* Highlighted spans need pointer-events so click-to-suppress works */
  .si-mirror :global(.hi) {
    pointer-events: auto;
    cursor: pointer;
    border-radius: 2px;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 2px;
  }

  .si-input {
    position: relative;
    z-index: 1;
    background: transparent;
    border: none;
    outline: none;
    /* Transparent text colour — the mirror's spans provide the colour */
    color: transparent;
    caret-color: var(--tr-ink); /* but keep a visible caret */
    display: block;
  }

  .si-input::placeholder {
    color: var(--tr-ink-soft);
  }
</style>
