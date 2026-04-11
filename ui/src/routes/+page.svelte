<!--
  Phase orchestrator.

  This is the single file that knows about *both* the API layer and
  every phase screen. It owns the transient state that the screens
  render, debounces similarity searches, and routes events from one
  phase to the next.

  Agents modifying a single phase screen do **not** need to read or
  touch this file — every phase component in `$lib/phases/` is
  pure and self-contained.

  Agents extending the *contract* between a screen and the backend
  (new prop, new event) will need to add the wiring here.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  import CaptureScreen from '$lib/phases/CaptureScreen.svelte';
  import ClarifyScreen from '$lib/phases/ClarifyScreen.svelte';
  import PlanScreen from '$lib/phases/PlanScreen.svelte';
  import DoScreen from '$lib/phases/DoScreen.svelte';
  import ReorientScreen from '$lib/phases/ReorientScreen.svelte';
  import ShutdownScreen, {
    type RitualState,
    type TimelineEntry,
    type TaskRow
  } from '$lib/phases/ShutdownScreen.svelte';

  import { getApi, type TaskRootApi } from '$lib/api';
  import type {
    CalendarEvent,
    Distraction,
    Phase,
    Suggestion,
    Task,
    TimeSession
  } from '$lib/types';

  let api: TaskRootApi | null = $state(null);
  let phase: Phase = $state('capture');

  // Capture
  let captureSuggestions: Suggestion[] = $state([]);
  let captureError: string | null = $state(null);
  let similarTimer: ReturnType<typeof setTimeout> | null = null;

  // Clarify
  let clarifyQueue: Task[] = $state([]);
  let clarifyIndex = $state(0);

  // Plan
  let monthStart: string = $state(isoMonthStart(new Date()));
  let showRecurring = $state(false);
  let allTasks: Task[] = $state([]);
  let allEvents: CalendarEvent[] = $state([]);
  let todayTasks: Task[] = $state([]);

  // Do
  let activeSession: TimeSession | null = $state(null);
  let distractions: Distraction[] = $state([]);
  let notePad = $state('');
  let persistentText = $state('');

  // Reorient
  let stats: Record<string, string | number> = $state({});

  // Shutdown
  let ritual: RitualState = $state({
    rating: 0,
    worked_on: '',
    worked_well: '',
    worked_poorly: '',
    change_tomorrow: ''
  });

  const currentClarifyTask = $derived(
    clarifyQueue[clarifyIndex] ?? null
  );
  const activeTask = $derived(
    activeSession
      ? allTasks.find((t) => t.id === activeSession!.task_id) ?? null
      : null
  );
  const lowThoughtTasks = $derived(
    todayTasks.filter((t) => t.is_low_thought === true)
  );
  const thoughtfulTasks = $derived(
    todayTasks.filter((t) => t.is_low_thought !== true)
  );
  const shutdownTaskRows: TaskRow[] = $derived(
    todayTasks.map((t) => ({
      id: t.id,
      name: t.name,
      expected_minutes: t.expected_duration,
      actual_minutes: 0
    }))
  );
  const shutdownTimeline: TimelineEntry[] = $state([]);

  onMount(async () => {
    api = await getApi();
    const bs = await api.bootstrap();
    activeSession = bs.active_session;
    todayTasks = await api.listTodayTasks();
  });

  function isoMonthStart(d: Date): string {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
  }

  // ----- Capture wiring -------------------------------------------------

  function onCaptureQueryChange(query: string) {
    if (similarTimer) clearTimeout(similarTimer);
    similarTimer = setTimeout(async () => {
      if (!api) return;
      try {
        captureSuggestions = await api.similarTasks(query);
      } catch {
        captureSuggestions = [];
      }
    }, 150);
  }

  async function onCapture(name: string) {
    if (!api) return;
    captureError = null;
    try {
      const task = await api.captureTask({ name });
      clarifyQueue = [...clarifyQueue, task];
      captureSuggestions = [];
    } catch (err) {
      captureError = err instanceof Error ? err.message : String(err);
    }
  }

  function onAdvanceFromCapture() {
    phase = 'clarify';
  }

  // ----- Clarify wiring -------------------------------------------------

  function onClarifyUpdate(patch: Partial<Task>) {
    const current = clarifyQueue[clarifyIndex];
    if (!current) return;
    const updated = { ...current, ...patch };
    clarifyQueue = clarifyQueue.map((t, i) => (i === clarifyIndex ? updated : t));
    // Persistence of clarify edits could go through api.captureTask again
    // once the bridge exposes an `updateTask` method — intentionally not
    // wired here yet.
  }

  function onClarifyAccept() {
    if (clarifyIndex < clarifyQueue.length - 1) {
      clarifyIndex += 1;
    } else {
      phase = 'plan';
    }
  }

  function onClarifySkip() {
    if (clarifyIndex < clarifyQueue.length - 1) {
      clarifyIndex += 1;
    }
  }

  function onAdvanceFromClarify() {
    phase = 'plan';
  }

  // ----- Plan wiring ----------------------------------------------------

  function onNavigateMonth(delta: -1 | 1) {
    const d = new Date(monthStart);
    d.setUTCMonth(d.getUTCMonth() + delta);
    monthStart = isoMonthStart(d);
  }

  function onToggleRecurring() {
    showRecurring = !showRecurring;
  }

  async function onAdvanceFromPlan() {
    phase = 'do';
    if (api) {
      todayTasks = await api.listTodayTasks();
      activeSession = await api.activeTimer();
    }
  }

  // ----- Do wiring ------------------------------------------------------

  async function onStartTimer(taskId: string) {
    if (!api) return;
    activeSession = await api.startTimer(taskId);
  }

  async function onStopTimer() {
    if (!api) return;
    await api.stopTimer();
    activeSession = null;
  }

  async function onLogDistraction(text: string) {
    if (!api) return;
    const d = await api.logDistraction(text);
    distractions = [d, ...distractions];
  }

  function onNotePadChange(text: string) {
    notePad = text;
  }

  function onPersistentChange(text: string) {
    persistentText = text;
  }

  function onReorient() {
    phase = 'reorient';
  }

  function onShutdown() {
    phase = 'shutdown';
  }

  // ----- Reorient wiring ------------------------------------------------

  function onReorientClose() {
    phase = 'do';
  }

  async function onInlineCapture(name: string) {
    if (!api) return;
    try {
      await api.captureTask({ name });
    } catch (err) {
      console.warn('inline capture failed:', err);
    }
  }

  function onOpenSettings() {
    // TODO: wire to a dedicated settings component once designed.
    console.info('settings requested');
  }

  // ----- Shutdown wiring ------------------------------------------------

  function onRitualChange(patch: Partial<RitualState>) {
    ritual = { ...ritual, ...patch };
  }

  function onShutdownFinish() {
    // Persistence of ritual answers goes here once the bridge exposes it.
    phase = 'do';
  }

  function onShutdownCancel() {
    phase = 'do';
  }
</script>

{#if phase === 'capture'}
  <CaptureScreen
    suggestions={captureSuggestions}
    error={captureError}
    onQueryChange={onCaptureQueryChange}
    onCapture={onCapture}
    onAdvance={onAdvanceFromCapture}
  />
{:else if phase === 'clarify'}
  <ClarifyScreen
    task={currentClarifyTask}
    remaining={Math.max(0, clarifyQueue.length - clarifyIndex)}
    onUpdate={onClarifyUpdate}
    onAccept={onClarifyAccept}
    onSkip={onClarifySkip}
    onAdvance={onAdvanceFromClarify}
  />
{:else if phase === 'plan'}
  <PlanScreen
    {monthStart}
    events={allEvents}
    tasks={allTasks}
    {todayTasks}
    {showRecurring}
    {onNavigateMonth}
    {onToggleRecurring}
    onAdvance={onAdvanceFromPlan}
  />
{:else if phase === 'do'}
  <DoScreen
    {lowThoughtTasks}
    {thoughtfulTasks}
    {activeSession}
    {activeTask}
    {distractions}
    {notePad}
    {persistentText}
    {onStartTimer}
    {onStopTimer}
    {onLogDistraction}
    {onNotePadChange}
    {onPersistentChange}
    {onReorient}
    {onShutdown}
  />
{:else if phase === 'reorient'}
  <ReorientScreen
    tasks={allTasks}
    events={allEvents}
    {stats}
    onClose={onReorientClose}
    {onInlineCapture}
    {onOpenSettings}
  />
{:else if phase === 'shutdown'}
  <ShutdownScreen
    timelineEntries={shutdownTimeline}
    taskRows={shutdownTaskRows}
    focus={{ active: 0, total: 0 }}
    {ritual}
    {onRitualChange}
    onFinish={onShutdownFinish}
    onCancel={onShutdownCancel}
  />
{/if}
