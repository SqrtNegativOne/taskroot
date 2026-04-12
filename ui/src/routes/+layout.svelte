<script lang="ts">
  let { children } = $props();
</script>

<main>
  {@render children?.()}
</main>

<style>
  :global(:root) {
    --tr-bg: #0c0c0a;
    --tr-ink: #deded9;
    --tr-ink-soft: #555550;
    --tr-line: #1e1e1c;
    --tr-surface: #151513;
    --tr-error: #cc5f54;
    --tr-accent: #5070a8;
    color-scheme: dark;
  }
  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    background: var(--tr-bg);
    color: var(--tr-ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  :global(button) {
    font-family: inherit;
  }
  :global(button:focus-visible) {
    outline: 2px solid var(--tr-accent);
    outline-offset: 2px;
  }
  :global(::placeholder) {
    color: var(--tr-ink-soft);
  }
  main {
    min-height: 100%;
  }
</style>
