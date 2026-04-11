# TaskRoot

Opinionated single-user task management system for Windows. Always-on,
keyboard-driven, structured around a fixed daily cycle
(Capture → Clarify → Plan → Do → Shutdown).

See [`plan.txt`](plan.txt) for the full requirements specification.

## Status

Early scaffolding. The Python backend (models, SQLite layer, day
cycle, recurrence, time tracker, bridge API) is in place. The PyQt
shell launches a placeholder HTML page. The Svelte UI is not yet built.

## Development

```bash
uv sync
uv run pytest
uv run python -m taskroot
```
