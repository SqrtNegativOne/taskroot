import { useState, useEffect, useRef } from "react";
import { useEvents, useStopwatch } from "../../../core/store/hooks";
import { TaskSelector } from "./TaskSelector";
import { useStopwatchKeyboard } from "./useStopwatchKeyboard";
import { ActiveTaskDisplay } from "./ActiveTaskDisplay";
import { useStopwatchEngine } from "./useStopwatchEngine";
import type { ReadonlyStopwatchContext } from "../../../core/domain/clock-strategies/types";
import type { ClockStrategy } from "../../../core/domain/clock-strategies/ClockStrategy";

function StopwatchDisplay({
    context,
    strategy,
    toggle,
}: {
    context: ReadonlyStopwatchContext;
    strategy: ClockStrategy;
    toggle: () => void;
}) {
    const [, setTick] = useState(0);

    // While running, request animation frame to update display tick
    useEffect(() => {
        let raf: number;
        const loop = () => {
            setTick((t) => t + 1);
            raf = requestAnimationFrame(loop);
        };
        if (strategy.requiresAnimationLoop(context)) {
            raf = requestAnimationFrame(loop);
        }
        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [strategy, context.state.runningSince, context.state.isBreak, context]);

    // Recalculate display data on every tick or context change
    const dynamicCurrentMs =
        context.state.elapsed +
        (context.running && !context.state.isBreak ? Date.now() - (context.state.runningSince || 0) : 0);
    
    const displayContext = { ...context, currentMs: dynamicCurrentMs };
    const data = strategy.getDisplayData(displayContext);

    return (
        <button
            type="button"
            aria-label="Toggle stopwatch"
            className={`stopwatch-display ${context.running ? "is-running" : ""} ${context.isPristine ? "is-pristine" : ""}`}
            onClick={toggle}
            title="Click to start/stop"
            style={{ color: data.color || "inherit" }}
        >
            <span className={`sw-digits sw-m ${data.secondaryText ? "col" : "row"}`}>
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
                            <span className="sw-secondary-text">{data.secondaryText}</span>
                        )}
                        <span className={`sw-primary-text ${data.secondaryText ? "has-secondary" : ""}`}>
                            {data.primaryText}
                        </span>
                    </>
                )}
            </span>
        </button>
    );
}

export function Stopwatch({ onBreakStatusChange }: { onBreakStatusChange?: (status: boolean) => void }) {
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [events] = useEvents();

    const {
        state,
        running,
        allowNoTask,
        activeTask,
        settings,
        tasks,
        strategy,
        context,
        actions
    } = useStopwatchEngine(setSelectorOpen);

    const [, setRealStopwatchState] = useStopwatch();

    const audioRef = useRef<HTMLAudioElement | null>(null);
    if (!audioRef.current) {
        audioRef.current = new Audio("/wine-glass-alarm.ogg");
    }

    useEffect(() => {
        if (!activeTask && !allowNoTask) {
            setSelectorOpen(true);
        }
    }, [activeTask, allowNoTask]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (state.isBreak && state.breakStartedAt && !state.breakSoundPlayed) {
            const ONE_SECOND_MS = 1000;
            interval = setInterval(() => {
                if (state.breakStartedAt && Date.now() - state.breakStartedAt >= state.breakAllowedMs) {
                    audioRef.current
                        ?.play()
                        .catch((e) => console.error("Sound play failed", e));
                    setRealStopwatchState((s) => ({ ...s, breakSoundPlayed: true }));
                }
            }, ONE_SECOND_MS);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.isBreak, state.breakStartedAt, state.breakAllowedMs, state.breakSoundPlayed, setRealStopwatchState]);

    const displayData = strategy.getDisplayData(context);
    useEffect(() => {
        if (onBreakStatusChange && displayData.isBreak !== undefined) {
            onBreakStatusChange(displayData.isBreak);
        }
    }, [displayData.isBreak, onBreakStatusChange]);

    useStopwatchKeyboard({ selectorOpen, setSelectorOpen, actions, activeTask, allowNoTask });

    return (
        <section className="stopwatch-hero">
            <div className="stopwatch-stage" style={{ position: "relative" }}>
                <StopwatchDisplay context={context} strategy={strategy} toggle={actions.toggle} />

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
                    startWithTask={actions.startWithTask}
                />
            </div>
        </section>
    );
}
