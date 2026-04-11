<script lang="ts">
  let { children } = $props();
</script>

<main>
  {@render children?.()}
</main>

<style>
  :global(:root) {
    --tr-bg: #f7f7f5;
    --tr-ink: #1c1c1a;
    --tr-ink-soft: #7b7b75;
    --tr-line: #d9d9d4;
    --tr-error: #b94a3d;
    color-scheme: light dark;
  }
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    background: var(--tr-bg);
    color: var(--tr-ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui,
      sans-serif;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  :global(button) {
    font-family: inherit;
  }
  main {
    min-height: 100%;
  }
</style>
