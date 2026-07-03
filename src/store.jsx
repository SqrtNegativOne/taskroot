// Shared localStorage-backed store. Used across Plan, Do, Rest.

const STORE_VERSION = 'v1';
const K = (k) => `taskroot:${STORE_VERSION}:${k}`;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(K(key));
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(K(key), JSON.stringify(value)); } catch (e) {}
}

// React hook: state synced to localStorage.
// `initial` is used only when the key is empty.
function useStored(key, initial) {
  const [val, setVal] = React.useState(() => load(key, initial));
  React.useEffect(() => { save(key, val); }, [key, val]);
  return [val, setVal];
}

// One-shot ensure: write `initial` to localStorage if key has never been set.
function ensure(key, initial) {
  if (localStorage.getItem(K(key)) == null) save(key, initial);
}

// Seed default data once (called by each page on first load).
function seedDefaults() {
  ensure('tasks', SAMPLE_TASKS);
  ensure('events', SAMPLE_EVENTS);
  ensure('distractions', SAMPLE_DISTRACTIONS);
  ensure('distractionStatuses', DEFAULT_STATUSES);
  ensure('distractionColumns', DEFAULT_DISTRACTION_COLUMNS);
  ensure('tips', SAMPLE_TIPS);
  ensure('notes', SAMPLE_NOTES);
  ensure('stopwatch', { elapsed: 0, runningSince: null });
}

Object.assign(window, { load, save, useStored, ensure, seedDefaults });
