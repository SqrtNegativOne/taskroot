# TaskRoot UI

SvelteKit SPA hosted inside pywebview.

## Running

```bash
npm install
npm run dev      # standalone dev server with the mock API
npm run build    # produces ./build/ for pywebview to load
npm run check    # svelte-check type check
```

When opened via `npm run dev` the app uses `src/lib/api/mock.ts`, a
fixture-backed implementation of the API surface. This means the full
UI can be developed, hot-reloaded, and visually inspected without the
Python backend running.

When opened inside pywebview (`uv run python -m taskroot`) the app
detects `window.pywebview.api` and uses `src/lib/api/bridge.ts`
instead. The switch is transparent to every phase component.

## Where to make changes

Every phase screen lives in `src/lib/phases/`. Each is a pure Svelte
component that receives props and emits events via callback props. It
imports only from `$lib/types`.

**To change how a phase looks or behaves, edit only its file in
`src/lib/phases/`.** You do not need to touch the API layer, the
routes, the mock, or the Python backend.

See `src/lib/phases/README.md` for the full contract.

## Build output location

`npm run build` writes `build/index.html` and assets. The Python
entry point (`src/taskroot/app.py`) walks up from its own directory to
find `ui/build/index.html`. For packaging, copy the contents of
`build/` into `src/taskroot/data/ui/` before shipping.
