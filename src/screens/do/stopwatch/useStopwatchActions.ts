import React from "react";
import { logWorkSession } from "../../../core/domain/clock-strategies/utils";
import type { AppTask, AppEvent } from "../../../core/domain/models";
import type { StopwatchState } from "../../../core/domain/clock-strategies/types";
import type { ClockStrategy } from "../../../core/domain/clock-strategies/ClockStrategy";

export const MIN_POLL_INTERVAL_MINUTES = 5;


interface UseStopwatchActionsProps {
    state: StopwatchState;
    setState: React.Dispatch<React.SetStateAction<StopwatchState>>;
    selectorOpen: boolean;
    setSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    running: boolean;
    isPristine: boolean;
    currentMs: number;
    timeLogs: AppEvent[] | undefined;
    setTimeLogs: React.Dispatch<React.SetStateAction<AppEvent[]>>;
    activeTask: AppTask | undefined;
    allowNoTask: boolean;
    settings: any;
    strategy: ClockStrategy;
    setTasks: any;
}

export function useStopwatchActions({
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
}: UseStopwatchActionsProps) {
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
        });

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
        });

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
        });
    };

    const startBreak = () => {
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
                        logWorkSession(
                            setTimeLogs,
                            s.runningSince,
                            Date.now(),
                            activeTask?.id,
                            "flowtime",
                        );
                    }
                    const elapsed =
                        s.elapsed +
                        (s.runningSince ? Date.now() - s.runningSince : 0);
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
    };

    return { toggle, reset, startWithTask, startBreak };
}
