# Phase screens

Every file in this folder is a **pure Svelte component**. It receives
all its data via props and emits every action via callback props. It
imports only from `$lib/types`.

## Rules for working in this folder

1. **Do not import `$lib/api`, `$lib/api/bridge`, or `$lib/api/mock`.**
   The orchestrator (`src/routes/+page.svelte`) wires the API to these
   components; the components themselves do not know the backend
   exists.

2. **Do not import from other phases.** If you need shared building
   blocks, put them in `$lib/components/` (create it if missing) and
   import those.

3. **Contract:** each component starts with a JSDoc block that lists
   the props it accepts and the callbacks it fires. Treat that as the
   single source of truth. If you need new data, add a prop; the
   orchestrator is responsible for feeding it.

4. **State:** local UI state (text inputs, which panel is expanded) is
   fine as `$state` inside the component. Persisted state (tasks,
   sessions, distractions) lives in the orchestrator and is passed
   down.

5. **Styling:** each component owns its own `<style>` block. Global
   tokens live in `src/routes/+layout.svelte` via CSS custom
   properties — prefer those over hard-coded colors.

## How to run a single phase in isolation

Because every phase is pure, you can open it in isolation by adding a
temporary route — for example, `src/routes/dev/capture/+page.svelte`
— that imports the phase component and hands it fixture data:

```svelte
<script lang="ts">
  import CaptureScreen from '$lib/phases/CaptureScreen.svelte';
  import { FIXTURE_TASKS } from '$lib/api/fixtures';
  import type { Suggestion } from '$lib/types';

  const suggestions: Suggestion[] = FIXTURE_TASKS.map((task) => ({
    task,
    score: 80
  }));
</script>

<CaptureScreen
  {suggestions}
  error={null}
  onQueryChange={(q) => console.log('query:', q)}
  onCapture={(name) => console.log('capture:', name)}
  onAdvance={() => console.log('advance')}
/>
```

Run `npm run dev`, visit `/dev/capture`, and iterate. Delete the dev
route when done.
