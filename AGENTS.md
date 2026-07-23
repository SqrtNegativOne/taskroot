# Taskroot Architecture & Guide for AI Agents

**CRITICAL**: When you modify the architecture, tech stack, or file structure of this project, you MUST update this `AGENTS.md` file to reflect the new state. Always verify if the information here is outdated and update any old information if needed.

Taskroot is a web-based and desktop task management app focusing on planning, executing, and resting. It is built as a Single Page Application (SPA) that can run in a browser or as a native desktop app via Electron.

## Tech Stack
- **Package Manager**: Bun (`bun`). Used for package management and running scripts.
- **Testing Framework**: Vitest (`vitest`). `bun test` has incompatibilities with testing React DOM components in this project. Use `npx vitest run` or `npm run test` instead.
- **Frontend Framework**: React 19 with React Router for SPA navigation.
- **Build Tool**: Vite (with Hot Module Replacement for fast development).
- **Desktop Wrapper**: Electron (configured via `electron/main.ts` and `preload.cts`).
- **Language**: TypeScript (`.tsx` and `.ts` files).
- **Styling**: Vanilla CSS (`src/index.css`) with extensive use of CSS variables for theming.
- **Backend / Storage**: Firebase Firestore for cloud sync, backed by `localStorage` for offline and fast local prototyping. 
- **Google Calendar Sync**: Native two-way sync with Google Calendar API.
- **Google Tasks Sync**: Native two-way sync with Google Tasks API.

## Project Structure (`src/`)

The application code is organized modularly by feature:

- `src/screens/plan/`: Components for the Plan screen (`PlanScreen.tsx`, `date-grid.tsx`, `tweaks-panel.tsx`, `shared-menus.tsx`).
- `src/screens/do/`: Components for the Do screen (`DoScreen.tsx`, `RestScreen.tsx`, `kanban.tsx`, `stopwatch.tsx`, `distraction-log.tsx`, `tips-notes.tsx`).
- `src/screens/login/`: Components for the login page (`LoginScreen.tsx`).
- `src/screens/settings/`: Components for the settings screen (`SettingsScreen.tsx`, `settings.css`).
- `src/screens/minitracker/`: Components for the mini tracker window (`MiniTrackerScreen.tsx`).
- `src/screens/graph/`, `src/screens/recap/`, `src/screens/stats/`, `src/screens/wrap/`: Other specialized screens.
- `src/components/`: Shared UI components used across multiple screens (e.g., `shell.tsx`, `collapsible.tsx`, `day-timeline.tsx`, `tasklist.tsx`).
- `src/core/`: Core business logic, context providers, and data layer.
  - `store.tsx`: Custom `useStored` hook that syncs state between React, LocalStorage, and Firebase Firestore.
  - `AuthContext.tsx`: Firebase Google authentication.
  - `SyncEngine.ts`, `GoogleCalendarAPI.ts`, `GoogleTasksAPI.ts`: Background syncing and API integrations.
  - `notifications.tsx`: Global toast notification system (`NotificationProvider` and `useNotification`).
  - `logger.ts`: Universal logger that prints to the browser console and forwards to `taskroot.log` via Electron IPC.
  - `data.tsx`, `settingsSchema.tsx`, `events.ts`, `filters.ts`, `rrule-utils.ts`: Core data structures and utilities.
- `src/App.tsx`: The root application component. Orchestrates routing, authentication bypass for dev, and global sync contexts.

*Note: Test files are co-located with their respective modules (e.g., `*.test.tsx`, `*.test.ts`).*

## Key Concepts
- **UI Controls**: Prefer using custom components like `SegmentedControl` (e.g. as used in the Settings screen) over native `<select>` dropdowns for settings, as they provide better styling consistency and avoid OS-specific dark/light mode issues (like white text on white background).
- **State Management**: The `useStored(key, defaultData)` hook acts as the primary state manager. It syncs optimistically to `localStorage` and persists to Firestore.
- **Offline/Online Mode**: Running `npm run start:offline` sets `VITE_OFFLINE_MODE=true` to automatically bypass the Google login screen for rapid UI testing and offline usage. Running `npm run start:online` requires normal authentication.
- **Drag and Drop**: Managed natively via pointer events (`pointerdown`, `pointermove`, `pointerup`) instead of the HTML5 Drag & Drop API for finer control and custom ghost elements.
- **Time Logging**: Stopwatch sessions (Axleless, Flowtime, Guzey) are logged to the `time_logs` store, optionally associated with a task.
- **MiniTracker**: When the main Electron window is minimized or closed, a frameless transparent window (`miniWin`) opens to show the timer in a compact form, using the `/?minitracker=true` route. **CRITICAL:** There should be NO buttons on the mini tracker window. Restoring the app or other actions should be done via keyboard shortcuts.
- **Settings Schema**: When adding settings to `settingsSchema.ts`, if a setting is self-explanatory, do NOT include a `description` property. Do not have subheadings (`section`) unless the related settings you are clumping in them are very similar.

## Style
- Prefer inline exports over bottom exports.