# CLAUDE.md

Guidance for Claude Code working in the TaskRoot repository.

## What this project is

TaskRoot is an opinionated, **single-user** task-management system for
Windows. It is always-on, keyboard-driven, and structured around a
fixed daily cycle: **Capture → Clarify → Plan → Do → Shutdown**. The
authoritative requirements doc is [`plan.txt`](plan.txt) at the repo
root — read it before making design decisions. Anything in plan.txt
marked **[OPEN]** is deliberately unresolved; ask before deciding.

## Tech stack

- **Python 3.12+**, managed with **`uv`** and a local `.venv`. Always
  run commands through `uv run ...`; never invoke a global `python`.
- **Pydantic v2** for all domain models, with `extra="allow"` so
  unknown fields round-trip through storage.
- **SQLite** for persistence, accessed via a hand-written layer in
  `src/taskroot/db.py`. No ORM.
- **pywebview 6** for the main window on the *main thread*, hosting a
  **Svelte** SPA via `file://`. pywebview 6 enforces main-thread
  execution at runtime — do not try to move it onto a worker.
- **pystray + Pillow** for the Windows tray icon, running on a daemon
  worker thread. We *do not* use PyQt6 for the tray: it would force
  `QApplication.exec()` onto the main thread, colliding with pywebview,
  and the `gui="qt"` workaround pulls in ~100 MB of PyQt6-WebEngine
  while swapping out Edge Chromium for QtWebEngine. See the docstring
  of `src/taskroot/app.py` for the full rationale. Revisit only if we
  need Qt-specific OS APIs (idle detection, global hotkeys) — and even
  then, prefer `plyer` / raw `ctypes` first.
- **rapidfuzz** for Capture-phase duplicate detection.
- **PyInstaller** (onedir, dev-dep only) packages a Windows `.exe`
  bundle. Entry script is `pyinstaller_entry.py` at the repo root, spec
  is `taskroot.spec`, output lands in `dist/TaskRoot/`.

## Commands

### Python (backend)

```bash
uv sync                   # install / update deps
uv run pytest             # run tests
uv run pytest -x          # stop on first failure
uv run ty check src tests # type check with Astral's ty
uv run python -m taskroot # launch the app shell
```

### SvelteKit (UI)

```bash
cd ui
npm install               # install JS deps
npm run dev               # standalone dev server with the mock API
npm run build             # produces ui/build/ (loaded by pywebview)
npm run check             # svelte-check + tsc
```

### Release packaging

```bash
# 1. Build the Svelte SPA, then vendor it into the Python package so
#    PyInstaller can pick it up via taskroot.spec. The vendored tree at
#    src/taskroot/data/ui/ is .gitignore-d — always rebuild from npm.
cd ui && npm install && npm run build && cd ..
rm -rf src/taskroot/data/ui && mkdir -p src/taskroot/data/ui
cp -r ui/build/* src/taskroot/data/ui/

# 2. Freeze with PyInstaller (onedir). Output: dist/TaskRoot/TaskRoot.exe
uv run pyinstaller taskroot.spec --clean --noconfirm
```

CI does this automatically via `.github/workflows/release.yml`. The
workflow fires on `release.published` (attaches a zip to the release
asset) or `workflow_dispatch` (uploads as an artifact for smoke-tests).

Use forward slashes in paths — the shell is Git Bash on Windows. Use
`/dev/null`, not `NUL`.

## Repository layout

```
plan.txt                           authoritative requirements spec
pyproject.toml                     uv-managed project file
dev.bat                            one-shot dev loop: rebuild UI + launch app
pyinstaller_entry.py               absolute-import entry for PyInstaller
taskroot.spec                      PyInstaller onedir spec (Windows)
.github/workflows/release.yml      builds + attaches the .exe on release
src/taskroot/
  __main__.py                      `python -m taskroot` entry point
  app.py                           pywebview (main) + pystray (worker) shell
  api.py                           Python↔Svelte bridge (webview JS API)
  models.py                        Pydantic v2 models for every entity
  db.py                            SQLite schema + repository methods
  day.py                           04:00 day-boundary / day-key logic
  verbs.py                         verb-prefix validator for task names
  recurrence.py                    rule firing + instance materialisation
  similarity.py                    fuzzy duplicate search for Capture
  timer.py                         single-active-session TimeTracker
  data/verbs.txt                   bundled English verb list
  data/placeholder.html            fallback UI until `ui/build/` exists
tests/                             pytest suite mirroring src/taskroot/
ui/                                SvelteKit SPA (adapter-static)
  src/lib/types.ts                 TS mirror of Pydantic models
  src/lib/api/index.ts             TaskRootApi interface + getApi()
  src/lib/api/bridge.ts             → window.pywebview.api
  src/lib/api/mock.ts              fixture-backed mock for npm run dev
  src/lib/api/fixtures.ts          sample tasks/distractions
  src/lib/phases/README.md         contract every phase component must obey
  src/lib/phases/*.svelte          pure phase screens — see rule 8 below
  src/hooks.ts                     reroute hook — strips /index.html (rule 11)
  src/routes/+layout.{ts,svelte}   prerendered SPA shell + design tokens
  src/routes/+page.svelte          phase orchestrator (wires API→phases)
```

## Non-negotiable design rules (from plan.txt)

Keep these in mind for every change:

1. **Write-on-change persistence.** Every mutation to Task, Event,
   TimeSession, or Distraction commits to SQLite before returning. No
   batched flushes, no in-memory-only state. The *only* data that may
   be lost to a crash is the Shutdown-ritual reflections.

2. **Unknown-field round-trip.** Storage must never drop fields it
   doesn't recognise. The mechanism: Pydantic models with
   `extra="allow"`, plus an `extras` JSON column on every entity table.
   See `db.py::_split_extras` / `_merge_extras`. Do not add new entity
   tables without reproducing this pattern, and do not "clean up" the
   extras columns — they are load-bearing. The test
   `tests/test_db.py::test_task_unknown_fields_round_trip` guards this.

3. **Instance model for recurrence.** A recurring task with a
   `recur_rule` is a *template* and is never completed. Instances are
   created at 04:00 on the day they fire, link back via `parent_id`,
   and are normal tasks in every respect. Calendar views render future
   *projections* from the rule without materialising tasks in advance.
   Never "roll forward" a template by mutating its dates.

4. **The day boundary is 04:00, not midnight.** Always use
   `taskroot.day.day_key(now)` to compute the current day, and
   `day_bounds(key)` for the half-open [start, end) interval. Never
   use `date.today()` in business logic — it will be wrong between
   00:00 and 04:00.

5. **Task names must start with a verb.** Enforced by
   `taskroot.verbs.validate_task_name`. This check runs at the Capture
   flow boundary, *not* in the Pydantic model — old rows must still
   load if the verb list ever tightens. Word-count limits (≤20 for
   name, ≤100 for description) are safe to enforce in the model.

6. **Phase modularity.** Capture, Clarify, Plan, Do, Reorient, and
   Shutdown should each end up in their own module. A bug in one phase
   must never corrupt data or crash another. High cohesion, low
   coupling.

7. **Android sync is deferred but not forgotten.** Do not introduce
   state that only lives in Python memory or depends on Qt-only
   primitives if it represents user data. Everything the user creates
   must be reconstructible from SQLite alone, because the file-based
   sync path (likely Syncthing over SQLite + JSON export) needs that
   to be true.

8. **Phase screens are pure components — do not couple them to the
   API.** Every file in `ui/src/lib/phases/` must import only from
   `$lib/types`. It receives data via props and emits events via
   callback props. The orchestrator (`ui/src/routes/+page.svelte`) is
   the single file allowed to import both phase components and the
   API. This is a hard constraint so an agent can modify, say,
   `DoScreen.svelte` without reading anything else about the system.
   See `ui/src/lib/phases/README.md` for the contract.

9. **Always run `ty` and `pytest` before declaring Python work done.**
   `ty` caught a real narrowing bug in `app.py` (QApplication.instance
   returning a `QCoreApplication` supertype). The combination is fast
   and worth the habit.

10. **Strict base-form verb policy** for task names. "Fixed the bug"
    and "Following up with Sam" are deliberately rejected — tasks are
    commands to your future self, and commands are imperative. Do not
    relax this by adding suffix-stripping, irregular-verb maps, or
    lemmatisation; the tests in `tests/test_verbs.py` enforce it.

11. **SvelteKit `file://` hosting is load-bearing.** The UI is served
    to pywebview as a prerendered static SPA, and three moving parts
    have to agree or you get a white screen or a 404:
    - `ui/svelte.config.js` — `paths.relative = true` and
      `fallback: '200.html'` (*not* `index.html`, or the fallback
      template clobbers the prerendered root page).
    - `ui/src/routes/+layout.ts` — `ssr = false` with
      `prerender = true`. With `prerender = false` the adapter only
      emits the fallback template, and its asset URLs are absolute
      (`/_app/...`) which under `file://` resolve to the drive root
      and 404. Prerendering honours `paths.relative` and emits
      `./_app/...`.
    - `ui/src/hooks.ts` — the `reroute` hook strips a trailing
      `index.html` before the router runs. Under `file://` the URL
      ends in `/index.html`, base stripping leaves `/index.html`, and
      the router has no such route, so it renders its built-in 404.
      The hook rewrites the path to `/` so the root route matches.

    If any of these three drift, verify via the built
    `ui/build/index.html`: the script imports must start with `./`
    (not `/`), and the `reroute` source string `'index.html'` must
    appear in one of the `_app/immutable/entry/app.*.js` chunks.

## Code style and conventions

- **No comments by default.** Only comment when the *why* is
  non-obvious — hidden constraints, surprising invariants, workarounds
  for specific bugs. Do not narrate what the code does.
- **Docstrings at module and class level are welcome** when they
  capture design rationale the user would otherwise have to reverse
  out of the code. Method-level docstrings only for public API that
  isn't self-explanatory from signature + type hints.
- **Type hints everywhere.** `from __future__ import annotations` at
  the top of every module, PEP 604 unions (`X | None`), no `Optional`.
- **Pydantic v2 idioms**: `model_validate`, `model_dump(mode="json")`,
  `field_validator`. No `parse_obj`, no `.dict()`.
- **UUIDs over ints** for primary keys — they cross the JSON/webview
  bridge cleanly and play nicely with the planned Syncthing sync.
- **ISO-8601 strings** for dates and datetimes in SQLite. They sort
  correctly and survive the JSON bridge without custom codecs.
- **Errors across the Python↔JS bridge** are returned as
  `{"error": str}` envelopes, not raised. See `api.py::_error` /
  `_ok`. This keeps the UI's error path uniform.

## When working on tasks

- **Schema changes are free — no migrations needed.** This app has no
  production users. When adding or removing columns, just edit
  `SCHEMA_SQL` in `db.py` and delete the local `taskroot.db` file.
  Never write `ALTER TABLE` or `PRAGMA table_info` migration code.
- **Before touching persistence**, re-read the "Unknown-field
  round-trip" rule above. The pattern is intentional, not a lint.
- **Before adding a new phase screen**, check whether the plan.txt
  section for that phase has `[OPEN]` markers. Surface them to the
  user rather than guessing.
- **Do not scaffold the Svelte app without being asked.** The exact
  bundler, routing strategy, and dev-server wiring is intentionally
  unresolved — it's a joint decision with the user.
- **Run `uv run pytest` before declaring work done.** The suite is
  small (seconds) and catches the high-value invariants.
- **Do not auto-commit.** Only commit when the user explicitly asks.

## Widget window (second pywebview window)

The floating day-column widget runs in a **separate pywebview window**,
not as an overlay inside the main window. Key facts:

- Created in `webview.start(func=_on_started)` callback so screen
  dimensions are available. If `ui/build/widget/index.html` is missing
  (bundle not yet built), the widget window is silently skipped.
- `transparent=True`, `on_top=True`, `frameless=True`, `easy_drag=False`.
  Sized to full screen height, 308 px wide, anchored to the right edge.
- Both windows share the same `js_api=api` instance — one Python object,
  one SQLite connection, no IPC needed.
- `_WindowController.show()` / `hide()` only affect the main window.
  `toggle_widget()` is called from the tray "Toggle widget" menu item.
- `_find_widget_index()` mirrors `_find_ui_index()` but looks for
  `widget/index.html` alongside `index.html`.

The widget route lives at `ui/src/routes/widget/+page.svelte` — it is
the only file outside `src/routes/+page.svelte` that may import both a
phase/widget component and the API (Rule 8 applies here too).

## Current state (2026-04-12)

Python backend:
- Pydantic models with word-count validation and `extra="allow"`
- SQLite layer with `extras` JSON round-trip, tested
- 04:00 day-boundary and recurrence logic, tested
- Verb validator with bundled list, strict base-form policy
- Python↔Svelte bridge API (bootstrap, capture, timer, distractions,
  calendar events: list_day_events, create_event, update_event,
  delete_event, schedule_task)
- `Task.scheduled_start` (datetime | None) for widget time placement
- pywebview main window + floating widget window (separate process
  windows, shared Api instance) + pystray tray with "Toggle widget"
- 144 passing tests; `ty` clean (1 pre-existing test failure unrelated
  to this session: test_capture_task_invalid_verb_returns_error)

SvelteKit UI:
- SvelteKit 2 + Svelte 5 + adapter-static SPA
- `$lib/api` with interface, real bridge, and fixture-backed mock
- Six pure phase components in `$lib/phases/`
- `DayColumnWidget.svelte` — pure component, no API imports
- Orchestrator at `src/routes/+page.svelte` wiring API→phases
- Widget orchestrator at `src/routes/widget/+page.svelte`
- Global design tokens in `+layout.svelte`
- `ui/build/` is checked locally; release CI rebuilds from scratch.

Release pipeline:
- `pyinstaller_entry.py` + `taskroot.spec` produce a Windows onedir
  bundle at `dist/TaskRoot/TaskRoot.exe` (verified running locally).
- `.github/workflows/release.yml` builds the SPA, vendors it into the
  package, runs `ty` + `pytest`, freezes with PyInstaller, and attaches
  a `TaskRoot-<tag>-windows-x64.zip` asset to any published GitHub
  release.
- When vendoring the UI, `widget/index.html` must be copied alongside
  `index.html` so `_find_widget_index()` finds it in the package.

Not yet implemented (explicit deferrals):
- Startup-on-boot registration (Windows Registry)
- Global summon/hide hotkey — plan.txt §Always-On marks this [OPEN]
- Idle detection — plan.txt §Do marks threshold and behaviour [OPEN]
- Unschedule-task API method (widget × on a task just refreshes for now)
- Real content for Plan, Reorient, Shutdown phases (stubs only)
- Break-type system tasks seeding
- Music player, calculator, Obsidian link list (Do phase)
- Android sync / JSON export

When extending this scaffold, prefer filling out the existing modules
over adding new top-level subsystems.
