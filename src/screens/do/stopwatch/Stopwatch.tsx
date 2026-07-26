
import React, { useState, useEffect, useRef } from "react";
import { useTasks, useStopwatch, useTimeLogs, useEvents, useSettings } from "../../../core/store/hooks";
import type { AppTask } from "../../../core/domain/models";
import { CLOCK_STRATEGIES } from "../../../core/domain/clock-strategies";
import { TaskSelector } from "./TaskSelector";
import { useStopwatchKeyboard } from "./useStopwatchKeyboard";
import { useStopwatchActions } from "./useStopwatchActions";

function ActiveTaskDisplay({
    settings,
    state,
    activeTask,
    running,
    allowNoTask,
    setSelectorOpen,
}: any) {
    const isGuzey = settings.clockStyle === "guzey";
    const isFlowBreak = state.isBreak;
    const shouldShowTask = activeTask && (running || isGuzey || isFlowBreak);

    if (shouldShowTask) {
        return (
            <button
                type="button"
                aria-label="Open task selector"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectorOpen(true);
                }}
                style={{
                    marginTop: "16px",
                    fontSize: "18px",
                    color: "var(--fg)",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "color 0.15s",
                    padding: "4px 12px",
                    borderRadius: "4px",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--fg)";
                }}
                title="Click to change task"
            >
                <span style={{ color: "var(--fg-dim)", marginRight: "8px" }}>
                    Working on:
                </span>
                <span style={{ fontWeight: 400 }}>{activeTask.title}</span>
            </button>
        );
    } else if (
        allowNoTask &&
        !activeTask &&
        (running || isGuzey || isFlowBreak)
    ) {
        return (
            <div
                style={{
                    marginTop: "16px",
                    fontSize: "18px",
                    color: "var(--fg-dim)",
                    textAlign: "center",
                }}
            >
                No active task.
            </div>
        );
    }
    return null;
}

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
        if (strategy.requiresAnimationLoop({ state })) {
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
        (running && !state.isBreak ? Date.now() - state.runningSince : 0);
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
        timeLogs,
        setTimeLogs,
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

    const displayData = strategy.getDisplayData({ currentMs, running, isPristine, toggle, state });
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
                    });

                    return (
                        <button
                            type="button"
                            aria-label="Toggle stopwatch"
                            className={`stopwatch-display ${running ? "is-running" : ""} ${isPristine ? "is-pristine" : ""}`}
                            onClick={toggle}
                            title="Click to start/stop"
                            style={{ color: data.color || "inherit", background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
                        >
                            <span
                                className="sw-digits sw-m"
                                style={{
                                    display: "flex",
                                    flexDirection: data.secondaryText ? "column" : "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 1,
                                }}
                            >
                                {data.showPlayIcon ? (
                                    <svg
                                        width="0.8em"
                                        height="0.8em"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                        style={{ marginLeft: "0.1em" }}
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                ) : (
                                    <>
                                        {data.secondaryText && (
                                            <span style={{ fontSize: "0.08em", fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                                                {data.secondaryText}
                                            </span>
                                        )}
                                        <span style={{ fontSize: data.secondaryText ? "0.7em" : "inherit", margin: data.secondaryText ? "2px 0" : "0" }}>
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
