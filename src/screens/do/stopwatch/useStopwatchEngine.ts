import React, { useCallback } from "react";
import { useTasks, useStopwatch, useTimeLogs, useSettings } from "../../../core/store/hooks";
import { CLOCK_STRATEGIES } from "../../../core/domain/clock-strategies";
import type { AppTask } from "../../../core/domain/models";
import type { ReadonlyStopwatchContext, ClockActionEffect } from "../../../core/domain/clock-strategies/types";
import { createWorkSessionEvent } from "../../../core/domain/clock-strategies/utils";
export const MIN_POLL_INTERVAL_MINUTES = 5;

const updateTaskStatus = (ts: AppTask[], taskId: string): AppTask[] => 
    ts.map(t => t.id === taskId ? { ...t, status: "doing" } : t.status === "doing" ? { ...t, status: "todo" } : t);

export function useStopwatchEngine(setSelectorOpen: (val: boolean) => void) {
    const [state, setState] = useStopwatch();
    const [tasks, setTasks] = useTasks();
    const [settings] = useSettings();
    const [, setTimeLogs] = useTimeLogs();

    const strategy = CLOCK_STRATEGIES[settings.clockStyle || "counter"] || CLOCK_STRATEGIES.counter;

    const running = state.runningSince !== undefined;
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
        setTasks((ts: AppTask[]) => updateTaskStatus(ts, taskId));
        applyEffect(strategy.calculateTaskSelected(context));
    }, [strategy, context, applyEffect, setTasks]);

    const startBreak = useCallback(() => {
        if (strategy.calculateStartBreak) applyEffect(strategy.calculateStartBreak(context));
    }, [strategy, context, applyEffect]);

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
