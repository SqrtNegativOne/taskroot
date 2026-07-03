# Taskroot Architecture & Guide for AI Agents

Taskroot is a web-based task management prototype focusing on planning, executing, and resting. It uses a lightweight React setup without a bundler for rapid prototyping.

## Tech Stack
- **HTML/CSS/JS**: Vanilla HTML, extensive CSS (`global.css`) with CSS variables for theming.
- **React**: Imported via unpkg CDN (React 18).
- **Babel**: Standalone in-browser Babel transpiler for compiling JSX on the fly.
- **Storage**: Uses `localStorage` via a custom `useStored` hook (defined in `store.jsx`). All data persists locally.

## Project Structure
- `plan.html`, `do.html`, `rest.html` - The main entry points/views.
- `src/`
  - `store.jsx`: LocalStorage wrapper and custom hook for shared state.
  - `data.jsx`: Dummy data, constants, and helper functions (e.g., date manipulation).
  - `global.css`: Centralized CSS, handling layout, colors (using CSS vars for themes).
  - `shell.jsx`: The top bar and navigation for moving between Plan/Do/Rest screens.
  - `app.jsx`: Root component for `plan.html`. Orchestrates layout, `TaskListPane`, and calendars.
  - `do-app.jsx`: Root component for `do.html`. Includes the hero stopwatch and kanban/notes sections.
  - `task-list.jsx`: Sidebar component containing the task filters and task rows. Tasks are draggable.
  - `kanban.jsx`: Kanban board used in the Do screen.

## Key Concepts
- **State Management**: `useStored(key, defaultData)` connects state to `localStorage`. Components re-rendering with the same key share state by syncing to storage, though they typically pass state down from a parent like `App` or pull it locally if independent (like `Stopwatch`).
- **Drag and Drop**: Managed natively via pointer events (`pointerdown`, `pointermove`, `pointerup`) instead of the HTML5 Drag & Drop API for finer control and custom ghost elements.

## Recent Changes
- The `TODAY` constant in `data.jsx` has been updated to use the real date instead of a hardcoded 2026 date.
- Added ability to edit, delete, and complete tasks from the task list pane.
- Linked the `Stopwatch` in the Do screen to the active (`doing`) task so you can see what you are currently focusing on, and easily mark it as done.
