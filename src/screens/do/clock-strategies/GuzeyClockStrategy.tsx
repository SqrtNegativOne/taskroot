import { useState, useEffect } from "react";
import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext, StopwatchState } from "./types";
import { logWorkSession } from "./utils";
import { PAD2 } from "../../../core/store/data";

function GuzeyClockDisplay({ toggleSelector, onBreakStatus, isPaused }: any) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        let raf: number;
        const loop = () => {
            setNow(new Date());
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const h = now.getHours();
    const min = now.getMinutes();

    let state = "";
    let nextMin = 0;
    let color = "var(--fg)";
    const isLongBreak = h % 3 === 0;

    if (isLongBreak && min < 35) {
        state = "LONG_BREAK";
        nextMin = 35;
        color = "var(--tag-green)";
    } else {
        if (min >= 0 && min < 5) {
            state = "BREAK";
            nextMin = 5;
            color = "var(--tag-green)";
        } else if (min >= 5 && min < 30) {
            state = "WORK";
            nextMin = 30;
            color = "var(--fg)";
        } else if (min >= 30 && min < 35) {
            state = "BREAK";
            nextMin = 35;
            color = "var(--tag-green)";
        } else {
            state = "WORK";
            nextMin = 60;
            color = "var(--fg)";
        }
    }

    let target = new Date(now);
    target.setSeconds(0);
    target.setMilliseconds(0);
    if (nextMin === 60) {
        target.setMinutes(0);
        target.setHours(target.getHours() + 1);
    } else {
        target.setMinutes(nextMin);
    }

    const remainingMs = target.getTime() - now.getTime();
    const remS = Math.floor(remainingMs / 1000);
    const remM = Math.floor(remS / 60);
    const finalS = remS % 60;

    const isBreakNow = state === "BREAK" || state === "LONG_BREAK";
    useEffect(() => {
        if (onBreakStatus) onBreakStatus(isBreakNow);
    }, [isBreakNow, onBreakStatus]);

    return (
        <button
            type="button"
            aria-label="Toggle task selector"
            className={`stopwatch-display ${isPaused ? "" : "is-running"}`}
            onClick={toggleSelector}
            title="Click to open task selector"
            style={{ color: isPaused ? "var(--fg-dim)" : color, background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
        >
            <span
                className="sw-digits sw-m"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    lineHeight: 1,
                }}
            >
                <span
                    style={{
                        fontSize: "0.08em",
                        fontWeight: 400,
                        letterSpacing: "0.12em",
                    }}
                >
                    {isPaused ? "TRACKING PAUSED" : state}
                </span>
                <span style={{ fontSize: "0.7em", margin: "2px 0" }}>
                    {PAD2(remM)}:{PAD2(finalS)}
                </span>
                <span
                    style={{
                        fontSize: "0.08em",
                        fontWeight: 400,
                        letterSpacing: "0.12em",
                    }}
                >
                    LEFT
                </span>
            </span>
        </button>
    );
}

export class GuzeyClockStrategy extends ClockStrategy {
    renderDisplay({ toggle, onBreakStatus, state }: StopwatchContext) {
        return (
            <GuzeyClockDisplay
                toggleSelector={toggle}
                onBreakStatus={onBreakStatus}
                isPaused={!state.runningSince}
            />
        );
    }

    requiresAnimationLoop() {
        return false;
    }

    onToggle({ setState, setTimeLogs, activeTask }: StopwatchContext) {
        setState((s): StopwatchState => {
            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "guzey",
                );
                return { ...s, runningSince: null };
            } else {
                return { ...s, runningSince: Date.now() };
            }
        });
    }

    onTaskSelected({ setSelectorOpen, setState }: StopwatchContext) {
        setSelectorOpen(false);
        setState((s) => ({ ...s, runningSince: Date.now() }));
    }

    onReset({ setSelectorOpen, setState, setTimeLogs, activeTask, state }: StopwatchContext) {
        if (state.runningSince) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "guzey",
            );
        }
        setState((s) => ({ ...s, runningSince: null }));
        setSelectorOpen(false);
    }
}
