
import { useState, useEffect, useRef } from "react";
import { useTasks, useStopwatch, useTimeLogs, useEvents, useSettings } from "../../../core/store/hooks";
import type { AppTask } from "../../../core/domain/models";
import { CLOCK_STRATEGIES } from "../../../core/domain/clock-strategies";
import { TaskSelector } from "./TaskSelector";
import { useStopwatchKeyboard } from "./useStopwatchKeyboard";
import { useStopwatchActions } from "./useStopwatchActions";
import { ActiveTaskDisplay } from "./ActiveTaskDisplay";

export function Stopwatch({ onBreakStatusChange }: { onBreakStatusChange?: (status: boolean) => void }) {
    const [state, setState] = useStopwatch();
    const [tasks, setTasks] = useTasks();
    const [events] = useEvents();
    const [settings] = useSettings();
    const [timeLogs, setTimeLogs] = useTimeLogs();

    const strategy =
        CLOCK_STRATEGIES[settings.clockStyle || "counter"] || CLOCK_STRATEGIES.counter;

    const [tick, setTick] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    if (!audioRef.current) {
        audioRef.current = new Audio("/wine-glass-alarm.ogg");
    }

    useEffect(() => {
        const active = tasks && tasks.find((t: AppTask) => t.status === "doing");
        if (!active && !settings.allowStopwatchWithoutTask) {
            setSelectorOpen(true);
        }
    }, [tasks, settings.allowStopwatchWithoutTask]);

    // While running, request animation frame to update display.
    useEffect(() => {
        let raf: number;
        const loop = () => {
            setTick((t) => t + 1);
            raf = requestAnimationFrame(loop);
        };
        if (strategy.requiresAnimationLoop({ state } as any)) {
            raf = requestAnimationFrame(loop);
        }
        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [strategy, state]);

    useEffect(() => {
        if (state.isBreak && state.breakStartedAt && !state.breakSoundPlayed) {
            if (Date.now() - state.breakStartedAt >= state.breakAllowedMs) {
                audioRef.current
                    ?.play()
                    .catch((e) => console.error("Sound play failed", e));
                setState((s) => ({ ...s, breakSoundPlayed: true }));
            }
        }
    }, [
        tick,
        state.isBreak,
        state.breakStartedAt,
        state.breakAllowedMs,
        state.breakSoundPlayed,
        setState,
    ]);

    const running = state.runningSince != null;
    const currentMs =
        state.elapsed +
        (running && !state.isBreak ? Date.now() - (state.runningSince || 0) : 0);
    const isPristine = currentMs === 0 && !running && !state.isBreak;
    const activeTask = tasks?.find((t: AppTask) => t.status === "doing");
    const allowNoTask = !!settings.allowStopwatchWithoutTask;

    const { toggle, reset, startWithTask, startBreak } = useStopwatchActions({
        state,
        setState,
        selectorOpen,
        setSelectorOpen,
        running,
        isPristine,
        currentMs,
        timeLogs: timeLogs as any,
        setTimeLogs: setTimeLogs as any,
        activeTask,
        allowNoTask,
        settings,
        strategy,
        setTasks,
    });

    const actionsRef = useRef({ toggle, reset, startBreak });
    useEffect(() => {
        actionsRef.current = { toggle, reset, startBreak };
    });

    const displayData = strategy.getDisplayData({ currentMs, running, isPristine, toggle, state } as any);
    useEffect(() => {
        if (onBreakStatusChange && displayData.isBreak !== undefined) {
            onBreakStatusChange(displayData.isBreak);
        }
    }, [displayData.isBreak, onBreakStatusChange]);

    useStopwatchKeyboard(selectorOpen, setSelectorOpen, actionsRef, activeTask, allowNoTask);

    return (
        <section className="stopwatch-hero">
            <div className="stopwatch-stage" style={{ position: "relative" }}>
                {(() => {
                    const data = strategy.getDisplayData({
                        currentMs,
                        running,
                        isPristine,
                        toggle,
                        state,
                    } as any);

                    return (
                        <button
                            type="button"
                            aria-label="Toggle stopwatch"
                            className={`stopwatch-display ${running ? "is-running" : ""} ${isPristine ? "is-pristine" : ""}`}
                            onClick={toggle}
                            title="Click to start/stop"
                            style={{ color: data.color || "inherit" }}
                        >
                            <span
                                className={`sw-digits sw-m ${data.secondaryText ? "col" : "row"}`}
                            >
                                {data.showPlayIcon ? (
                                    <svg
                                        width="0.8em"
                                        height="0.8em"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="sw-play-icon"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                ) : (
                                    <>
                                        {data.secondaryText && (
                                            <span className="sw-secondary-text">
                                                {data.secondaryText}
                                            </span>
                                        )}
                                        <span className={`sw-primary-text ${data.secondaryText ? "has-secondary" : ""}`}>
                                            {data.primaryText}
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    );
                })()}

                <ActiveTaskDisplay
                    settings={settings}
                    state={state}
                    activeTask={activeTask}
                    running={running}
                    allowNoTask={allowNoTask}
                    setSelectorOpen={setSelectorOpen}
                />

                <TaskSelector
                    selectorOpen={selectorOpen}
                    setSelectorOpen={setSelectorOpen}
                    tasks={tasks || []}
                    events={events || []}
                    activeTask={activeTask}
                    allowNoTask={allowNoTask}
                    startWithTask={startWithTask}
                />
            </div>
        </section>
    );
}
