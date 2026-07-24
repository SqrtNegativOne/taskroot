// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useTasks, useStopwatch, useTimeLogs, useEvents, useSettings } from "../../core/store/hooks";
import type { AppTask } from "../../core/domain/models";
import { CLOCK_STRATEGIES } from "./clock-strategies";
import { logWorkSession } from "./clock-strategies/utils";
import { TaskSelector } from "./TaskSelector";
import { useStopwatchKeyboard } from "./useStopwatchKeyboard";

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
        (running && !state.isBreak ? Date.now() - state.runningSince : 0);
    const isPristine = currentMs === 0 && !running && !state.isBreak;
    const activeTask = tasks?.find((t: AppTask) => t.status === "doing");
    const allowNoTask = !!settings.allowStopwatchWithoutTask;

    const toggle = () =>
        strategy.onToggle({
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
        } as any);

    const reset = () =>
        strategy.onReset({
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
        } as any);

    const startWithTask = (taskId: string) => {
        setTasks((ts: AppTask[]) =>
            ts.map((t) => {
                if (t.id === taskId) return { ...t, status: "doing" };
                if (t.status === "doing") return { ...t, status: "todo" };
                return t;
            }),
        );
        strategy.onTaskSelected({
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
        } as any);
    };

    const startBreak = () => {
        if (settings.clockStyle === "flowtime") {
            setState((s) => {
                if (s.isBreak) {
                    // End break
                    return {
                        ...s,
                        isBreak: false,
                        elapsed: 0,
                        runningSince: Date.now(),
                    };
                } else {
                    // Start break
                    if (s.runningSince)
                        logWorkSession(
                            setTimeLogs,
                            s.runningSince,
                            Date.now(),
                            activeTask?.id,
                            "flowtime",
                        );
                    const elapsed =
                        s.elapsed +
                        (s.runningSince ? Date.now() - s.runningSince : 0);
                    const div = settings.flowtimeBreakDivisor || 5;
                    return {
                        ...s,
                        isBreak: true,
                        breakAllowedMs: elapsed / div,
                        breakStartedAt: Date.now(),
                        runningSince: null,
                        elapsed: 0,
                        breakSoundPlayed: false,
                    };
                }
            });
        }
    };

    const actionsRef = useRef({ toggle, reset, startBreak });
    useEffect(() => {
        actionsRef.current = { toggle, reset, startBreak };
    });

    useStopwatchKeyboard(selectorOpen, setSelectorOpen, actionsRef, activeTask, allowNoTask);

    return (
        <section className="stopwatch-hero">
            <div className="stopwatch-stage" style={{ position: "relative" }}>
                {strategy.renderDisplay({
                    currentMs,
                    running,
                    isPristine,
                    toggle,
                    onBreakStatus: onBreakStatusChange,
                    state,
                } as any)}

                {(() => {
                    const isGuzey = settings.clockStyle === "guzey";
                    const isFlowBreak = state.isBreak;
                    const shouldShowTask =
                        activeTask && (running || isGuzey || isFlowBreak);
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
                                    e.currentTarget.style.color =
                                        "var(--accent)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "var(--fg)";
                                }}
                                title="Click to change task"
                            >
                                <span
                                    style={{
                                        color: "var(--fg-dim)",
                                        marginRight: "8px",
                                    }}
                                >
                                    Working on:
                                </span>
                                <span style={{ fontWeight: 400 }}>
                                    {activeTask.title}
                                </span>
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
                })()}

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
