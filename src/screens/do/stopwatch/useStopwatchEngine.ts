import { useCallback } from "react";
import { useTasks, useStopwatch, useTimeLogs, useSettings } from "../../../core/store/hooks";
import { CLOCK_STRATEGIES } from "../../../core/domain/clock-strategies";
import type { AppTask } from "../../../core/domain/models";
import type { StopwatchState, ReadonlyStopwatchContext, ClockActionEffect } from "../../../core/domain/clock-strategies/types";
import { createWorkSessionEvent } from "../../../core/domain/clock-strategies/utils";
export const MIN_POLL_INTERVAL_MINUTES = 5;

export function useStopwatchEngine(selectorOpen: boolean, setSelectorOpen: (val: boolean) => void) {
    const [state, setState] = useStopwatch();
    const [tasks, setTasks] = useTasks();
    const [settings] = useSettings();
    const [, setTimeLogs] = useTimeLogs();

    const strategy = CLOCK_STRATEGIES[settings.clockStyle || "counter"] || CLOCK_STRATEGIES.counter;

    const running = state.runningSince != null;
    const currentMs = state.elapsed + (running && !state.isBreak ? Date.now() - (state.runningSince || 0) : 0);
    const isPristine = currentMs === 0 && !running && !state.isBreak;
    const activeTask = tasks?.find((t: AppTask) => t.status === "doing");
    const allowNoTask = !!settings.allowStopwatchWithoutTask;

    const context: ReadonlyStopwatchContext = React.useMemo(() => ({
        state,
        currentMs,
        isPristine,
        running,
        activeTask,
        allowNoTask,
        settings
    }), [state, currentMs, isPristine, running, activeTask, allowNoTask, settings]);

    const applyEffect = useCallback((effect: ClockActionEffect) => {
        if (effect.shouldLogSession && state.runningSince) {
            const ev = createWorkSessionEvent(
                state.runningSince,
                Date.now(),
                activeTask?.id,
                settings.clockStyle || "counter"
            );
            if (ev) {
                setTimeLogs((logs) => [...(logs || []), ev]);
            }
        }
        if (effect.newState) {
            setState((s) => ({ ...s, ...effect.newState }));
        }
        if (effect.selectorOpen !== undefined) {
            setSelectorOpen(effect.selectorOpen);
        }
    }, [state, activeTask, settings, setTimeLogs, setState, setSelectorOpen]);

    const toggle = useCallback(() => {
        const effect = strategy.calculateToggle(context);
        applyEffect(effect);
    }, [strategy, context, applyEffect]);

    const reset = useCallback(() => {
        const effect = strategy.calculateReset(context);
        applyEffect(effect);
    }, [strategy, context, applyEffect]);

    const startWithTask = useCallback((taskId: string) => {
        setTasks((ts: AppTask[]) =>
            ts.map((t) => {
                if (t.id === taskId) return { ...t, status: "doing" };
                if (t.status === "doing") return { ...t, status: "todo" };
                return t;
            })
        );
        const effect = strategy.calculateTaskSelected(context);
        applyEffect(effect);
    }, [strategy, context, applyEffect, setTasks]);

    const startBreak = useCallback(() => {
        if (settings.clockStyle === "flowtime") {
            setState((s: StopwatchState) => {
                if (s.isBreak) {
                    return {
                        ...s,
                        isBreak: false,
                        elapsed: 0,
                        runningSince: Date.now(),
                    };
                } else {
                    if (s.runningSince) {
                        const ev = createWorkSessionEvent(
                            s.runningSince,
                            Date.now(),
                            activeTask?.id,
                            "flowtime"
                        );
                        if (ev) {
                            setTimeLogs((logs) => [...(logs || []), ev]);
                        }
                    }
                    const elapsed = s.elapsed + (s.runningSince ? Date.now() - s.runningSince : 0);
                    const div = settings.flowtimeBreakDivisor || MIN_POLL_INTERVAL_MINUTES;
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
    }, [settings.clockStyle, settings.flowtimeBreakDivisor, setState, activeTask, setTimeLogs]);

    return {
        state,
        currentMs,
        isPristine,
        running,
        activeTask,
        allowNoTask,
        settings,
        tasks,
        strategy,
        context,
        actions: { toggle, reset, startWithTask, startBreak }
    };
}
