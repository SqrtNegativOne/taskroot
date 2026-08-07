# Taskroot Architecture & Guide for AI Agents
**CRITICAL**: When you modify the architecture, tech stack, or file structure of this project, you MUST update this `AGENTS.md` file to reflect the new state. Always verify if the information here is outdated and update any old information if needed.

Taskroot is a web-based and desktop task management app focusing on planning, executing, and resting. It is built as a Single Page Application (SPA) that can run in a browser or as a native desktop app via Electron.

## Tech Stack
- **Package Manager**: Bun (`bun`). Used for package management and running scripts. Do not use `npm run build`; use `bun run build` instead. But also do not use `bun run test`; use `npm run test` instead.
- **Testing Framework**: Vitest (`vitest`). `bun test` has incompatibilities with testing React DOM components in this project. Use `npx vitest run` or `npm run test` instead.
- **Frontend Framework**: React 19 with React Router for SPA navigation.
- **Build Tool**: Vite (with Hot Module Replacement for fast development).
- **Desktop Wrapper**: Electron (configured via `electron/main.ts` and `preload.cts`).
- **Linter**: Oxlint (`oxlint`), configured via `.oxlintrc.json`, with **type-aware linting enabled** (`--type-aware`). Run `bun run lint`.
- **Language**: TypeScript (`.tsx` and `.ts` files).
- **Styling**: Vanilla CSS (`src/index.css`) with extensive use of CSS variables for theming.
- **Backend / Storage**: `localStorage` for offline and fast local prototyping, synced to Google Tasks and Google Calendar. 
- **Google Calendar Sync**: Native two-way sync with Google Calendar API.
- **Google Tasks Sync**: Native two-way sync with Google Tasks API.

## Project Structure (`src/`)

- `src/screens/plan/`: Components for the Plan screen (`PlanScreen.tsx`, `date-grid/` directory, `shared-menus/` directory, `drag-helpers.tsx`, `drag-utils.ts`, `use-drag-and-drop.ts`, `use-plan-actions.ts`, `use-plan-events.ts`).
- `src/screens/do/`: Components for the Do screen (`DoScreen.tsx`, `rest/` directory, `TaskSelector/` directory, `kanban.tsx`, `stopwatch/` directory, `distraction-log/` directory, `tips-notes.tsx`).
- `src/screens/login/`: Components for the login page (`LoginScreen.tsx`).
- `src/screens/settings/`: Components for the settings screen (`SettingsScreen.tsx`, `SettingActions.tsx`, `SettingRenderers.tsx`, `settingRegistry.ts`, `settings.css`).
- `src/screens/minitracker/`: Components for the mini tracker window (`MiniTrackerScreen.tsx`).
- `src/screens/graph/`, `src/screens/recap/`, `src/screens/stats/`, `src/screens/wrap/`: Other specialized screens.
- `src/components/`: Shared UI components used across multiple screens (e.g., `AppLayout.tsx`, `shell/` directory, `collapsible.tsx`, `tasklist/` directory, `split-pane.tsx`, `search-bar.tsx`, `icon.tsx`, `day-timeline/`, `inputs/`, `inspector-pane/`).
- `src/core/`: Core business logic, context providers, and data layer, categorized by responsibility:
  - `sync/`: External sync & third-party APIs (`index.ts`, `SyncState.ts`, `calendar-api/` directory, `task-api/` directory, `auth/` directory, and the `engine/` subdirectory containing `SyncQueue.ts`, `Synchronizer.ts`, `TaskSyncStrategy.ts`, `EventSyncStrategy.ts`, `Pusher.ts`, `Poller.ts`, etc. for modular sync processing).
  - `store/`: State management & persistence (`hooks.ts`, `repositories.ts`, `storeRegistry.ts`, `api.ts`, `data.ts`, `settingsSchema/` directory).
  - `domain/`: Business logic & transformations (`clock-strategies/` directory, `events.ts`, `filters.ts`, `rrule-utils.ts`, `models.ts`).
  - `auth/`: Authentication (`AuthContext.tsx`, `googleAuthUtils.ts`, `context.ts`, `useAuth.ts`).
  - `utils/`: App-wide utilities (`logger.ts`, `notifications.tsx`, `colors.ts`, `constants.ts`).
- `src/App.tsx`: The root application component. Orchestrates routing, authentication bypass for dev, and global sync contexts.

*Note: Test files are co-located with their respective modules (e.g., `*.test.tsx`, `*.test.ts`).*

## Key Concepts
- **UI Controls**: Prefer using custom components like `SegmentedControl` (e.g. as used in the Settings screen) over native `<select>` dropdowns for settings, as they provide better styling consistency and avoid OS-specific dark/light mode issues (like white text on white background).
- **State Management**: The `useStored(key, defaultData)` hook acts as the primary state manager. It syncs optimistically to `localStorage` and persists via the modular Sync engine (Pusher/Poller) via `storeRegistry`.
- **Offline/Online Mode**: Running `npm run start:offline` sets `VITE_OFFLINE_MODE=true` to automatically bypass the Google login screen for rapid UI testing and offline usage. Running `npm run start:online` requires normal authentication.
- **Drag and Drop**: Managed natively via pointer events (`pointerdown`, `pointermove`, `pointerup`) instead of the HTML5 Drag & Drop API for finer control and custom ghost elements.
- **Time Logging**: Stopwatch sessions (Axleless, Flowtime, Guzey) are logged to the `time_logs` store, optionally associated with a task.
- **MiniTracker**: When the main Electron window is minimized or closed, a frameless transparent window (`miniWin`) opens to show the timer in a compact form, using the `/?minitracker=true` route. **CRITICAL:** There should be NO buttons on the mini tracker window. Restoring the app or other actions should be done via keyboard shortcuts.
- **Settings Schema**: When adding settings to `settingsSchema/settingsSchema.tsx`, if a setting is self-explanatory, do NOT include a `description` property. Do not have subheadings (`section`) unless the related settings you are clumping in them are very similar.
- **Time Representation**: The application uses floating ISO-like strings (e.g., `2026-08-02T09:00:00`) devoid of timezone information for `AppEvent` `startTime` and `endTime`. This ensures that events rendered on the calendar visually stay at their local times regardless of the user's timezone. Care must be taken when converting these floating times to absolute timestamps, as Daylight Saving Time transitions and timezone contexts can complicate the conversion during syncs (like with Google Calendar). Use `toFloatingIso(date)` from `date-utils.ts` to generate these. All-day events are modeled by using date-only `"YYYY-MM-DD"` strings for both `startTime` and `endTime`, instead of a dedicated boolean flag, to better adhere to calendar standards (RFC 5545).

## Style (Important)
- Prefer inline exports over bottom exports.
- Remember that you may not need a useEffect. useEffect is an escape hatch for when you need to imperatively run code after a render. If you can do it declaratively, do it declaratively.
- Keep all React components pure and functional.
- Any object that represents state should be readonly.
- If you want a component to return nothing, try not to return a null. Conditionally include or exclude the component in the parent's tsx (so React doesn't unnecessarily mount that component, run its `useEffect`s, initialize its state, only to render nothing).
- Use Red-Green Test Driven Development.
    - Write tests first as a contract and to make it clear what you are doing.
    - Once they are written, do not modify them, unless there is something truly wrong wit them.
    - Only after the tests are written, should you start writing code.
- Code should be self-documenting. If you feel the need to make a comment, consider refactoring the code to make it more readable instead.
    - To explain why a particular variable is used, replace it with a constant.
    - Use variables to name parts of expressions, so conditions read like a comment does. You can also consider moving them to their own function.
    - Types can also help remove comments.
    - If your code is doing something nonobvious for performance reasons... you can use comments.
- Strongly type your code. Don't use shortcuts. A list of nonexhaustive shortcuts given below:
  - Do not use `any` or `Function` type ever.
  - Never use `as` type assertions unless absolutely necessary. If you find yourself needing to use `as`, consider refactoring the code to avoid it. If you must use `as`, you must include a comment in the code before it explaining why it is necessary. `as const` is fine obviously.
  - Never use `// @ts-ignore` or `// @ts-expect-error` or similar on any file or line.
  - Prefer compile-time type inference over runtime type assertions or checks (e.g., `typeof`).
  - Use TypeScript Template Literal Types instead of string unions wherever possible.
  - Use optional chaining operators (`?.`) over non-null assertions (`!.`).
- Write small, nice code. For example:
  - Refactor files if they exceed 250 LOC.
    - If a test file exceeds 250 LOC, obviously don't split it up into multiple files. Instead, refactor the code under test to be smaller and more modular, and then write smaller test files for each module.
  - Refactor classes if they exceed 10 methods.
  - Refactor any bit of code if it exceeds 4 levels of indentation.
    - Use extraction (creating new, smaller functions) and inversion of control (early returns).
  - The ideal number of arguments for a function is zero (niladic). Next comes one (monadic), followed closely by two (dyadic). Three arguments (triadic) should be avoided where possible. More than three (polyadic) requires very special justification—and then shouldn’t be used anyway.
- If you add a `// eslint-disable-next-line` or `// oxlint-disable-next-line` comment, don't. If it's necessary, you must include a comment in the code before it explaining why it is necessary, AND THEN you must warn the user you are talking to, that you have done this.
- Don't name files or folders with generic names like `utils` or `helpers`. That could literally mean anything!
- Don't use generic names, like suffixing a function or class with `Manager`, `Controller`, `Helper`, or `Service`.
- After implementing any changes, run `bun run lint`, and fix all errors and warnings. If you are unsure about a warning, ask for clarification in the code review.
- When you have too much inter-dependent state (e.g., toggling the stopwatch needs to know about selectorOpen, running, currentMs, timeLogs, etc.), consider useReducer.
- ALWAYS run `bun run lint`, `npm run test`, and `bun run build` before committing. If any of these fail or give you a warning, fix the issue before committing.
- If `bun run build` gives you a warning, fix it. Never be silent about warnings; always inform the user about them.
- In the program, errors are data; not exceptional in any way. Don't return `null` or `False` when an error happens; be specific.