import React from "react";
import { ClockStrategy } from "./ClockStrategy";
import { StopwatchContext } from "./types";
import { logWorkSession, splitTime } from "./utils";

function CounterClockDisplay({ running, isPristine, currentMs, toggle }: any) {
    const { m } = splitTime(currentMs);
    return (
        <button
            type="button"
            aria-label="Toggle stopwatch"
            className={`stopwatch-display ${running ? "is-running" : ""} ${isPristine ? "is-pristine" : ""}`}
            onClick={toggle}
            title="Click to start/stop"
            style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
        >
            <span
                className="sw-digits sw-m"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {isPristine ? (
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
                    m
                )}
            </span>
        </button>
    );
}

export class CounterClockStrategy extends ClockStrategy {
    renderDisplay({ currentMs, running, isPristine, toggle }: StopwatchContext) {
        return (
            <CounterClockDisplay
                running={running}
                isPristine={isPristine}
                currentMs={currentMs}
                toggle={toggle}
            />
        );
    }

    requiresAnimationLoop({ state }: StopwatchContext) {
        return state.runningSince != null;
    }

    onToggle({
        isPristine,
        setSelectorOpen,
        setState,
        setTimeLogs,
        activeTask,
        allowNoTask,
    }: StopwatchContext) {
        if (isPristine && !activeTask && !allowNoTask) {
            setSelectorOpen(true);
            return;
        }
        setState((s) => {
            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "counter",
                );
                return {
                    ...s,
                    elapsed: s.elapsed + (Date.now() - s.runningSince),
                    runningSince: null,
                };
            }
            return { ...s, runningSince: Date.now() };
        });
    }

    onTaskSelected({ running, setState, setSelectorOpen }: StopwatchContext) {
        setSelectorOpen(false);
        if (!running) {
            setState((s) => ({ ...s, runningSince: Date.now() }));
        }
    }

    onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }: StopwatchContext) {
        if (state.runningSince) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "counter",
            );
        }
        setState((s) => ({ ...s, elapsed: 0, runningSince: null }));
        setSelectorOpen(false);
    }
}
