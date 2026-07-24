import { ClockStrategy } from "./ClockStrategy";
import type { StopwatchContext } from "./types";
import { logWorkSession, splitTime } from "./utils";
import { PAD2 } from "../../../core/store/data";

function FlowtimeClockDisplay({
    running,
    isPristine,
    currentMs,
    isBreak,
    breakRemainingMs,
    toggle,
}: any) {
    const { m } = splitTime(currentMs);
    let displayNode;

    if (isBreak) {
        const remSecs = Math.max(0, Math.ceil(breakRemainingMs / 1000));
        const remM = Math.floor(remSecs / 60);
        const remS = remSecs % 60;
        const color = remSecs === 0 ? "var(--red)" : "var(--tag-green)";
        displayNode = (
            <span
                style={{
                    color,
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
                    BREAK
                </span>
                <span style={{ fontSize: "0.7em", margin: "2px 0" }}>
                    {PAD2(remM)}:{PAD2(remS)}
                </span>
            </span>
        );
    } else {
        displayNode = isPristine ? (
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
        );
    }

    return (
        <button
            type="button"
            aria-label="Toggle clock"
            className={`stopwatch-display ${running ? "is-running" : ""} ${isPristine ? "is-pristine" : ""}`}
            onClick={toggle}
            title="Click to start/stop"
            style={{ background: "none", border: "none", font: "inherit", color: "inherit", padding: 0, cursor: "pointer" }}
        >
            <span
                className="sw-digits sw-m"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {displayNode}
            </span>
        </button>
    );
}

export class FlowtimeClockStrategy extends ClockStrategy {
    renderDisplay({ currentMs, running, isPristine, toggle, state }: StopwatchContext) {
        let breakRem = 0;
        if (state.isBreak && state.breakStartedAt) {
            breakRem =
                state.breakAllowedMs - (Date.now() - state.breakStartedAt);
        }
        return (
            <FlowtimeClockDisplay
                running={running}
                isPristine={isPristine}
                currentMs={currentMs}
                isBreak={state.isBreak}
                breakRemainingMs={breakRem}
                toggle={toggle}
            />
        );
    }

    requiresAnimationLoop({ state }: StopwatchContext) {
        return state.runningSince != null || state.isBreak;
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
            if (s.isBreak) return s; // can't pause in break (feature not a bug)

            if (s.runningSince) {
                logWorkSession(
                    setTimeLogs,
                    s.runningSince,
                    Date.now(),
                    activeTask?.id,
                    "flowtime",
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

    onTaskSelected({ running, setState, setSelectorOpen, state }: StopwatchContext) {
        setSelectorOpen(false);
        if (!running && !state.isBreak) {
            setState((s) => ({ ...s, runningSince: Date.now() }));
        }
    }

    onReset({ state, setState, setSelectorOpen, setTimeLogs, activeTask }: StopwatchContext) {
        if (state.runningSince && !state.isBreak) {
            logWorkSession(
                setTimeLogs,
                state.runningSince,
                Date.now(),
                activeTask?.id,
                "flowtime",
            );
        }
        setState((s) => ({
            ...s,
            elapsed: 0,
            runningSince: null,
            isBreak: false,
            breakAllowedMs: 0,
            breakStartedAt: null,
        }));
        setSelectorOpen(false);
    }
}
