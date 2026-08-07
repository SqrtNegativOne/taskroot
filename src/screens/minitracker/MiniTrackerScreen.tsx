import React, { useState, useEffect } from "react";
import "@fontsource-variable/roboto-mono";
import { useTasks, useEvents, useStopwatch, useSettings } from "../../core/store/hooks";
import { expandEventsForView } from "../../core/domain/rrule-utils";
import { isEventAllDay, hydrateEvents } from "../../core/domain/events";
import { toFloatingIso, MS_IN_MINUTE, addDays } from "../../core/utils/date-utils";
import type { AppTask, AppEvent } from "../../core/domain/models";
import "./minitracker.css";
import { MiniTrackerClock } from "./MiniTrackerClock";
import type { StopwatchState } from "../../core/domain/clock-strategies/types";
import type { AppSettings } from "../../core/store/settingsSchema";

const OPACITY_DIM = 0.2;
const OPACITY_HOVER = 0.8;

function isRestoreShortcut(e: KeyboardEvent, keybindingRestoreApp: string | undefined): boolean {
    const kb = keybindingRestoreApp || "Ctrl+Alt+R";
    const parts = kb.split("+");
    const key = parts.pop();
    const keyMatch = e.key.toUpperCase() === key?.toUpperCase() || (e.key === " " && key === "Space");
    
    return e.ctrlKey === parts.includes("Ctrl") && 
           e.altKey === parts.includes("Alt") && 
           e.shiftKey === parts.includes("Shift") && 
           e.metaKey === parts.includes("Meta") && 
           keyMatch;
}

function isDimShortcut(e: KeyboardEvent): boolean {
    return e.key.toLowerCase() === "h" && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
}

function useMiniTrackerKeybindings(
    keybindingRestoreApp: string | undefined,
    setIsDimmed: React.Dispatch<React.SetStateAction<boolean>>
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isRestoreShortcut(e, keybindingRestoreApp)) {
                e.preventDefault();
                if (window.electronAPI?.restoreMainWindow) {
                    window.electronAPI.restoreMainWindow();
                }
            } else if (isDimShortcut(e)) {
                setIsDimmed((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [keybindingRestoreApp, setIsDimmed]);
}


const handleDoubleClick = () => {
    if (window.electronAPI?.restoreMainWindow)
        window.electronAPI.restoreMainWindow();
};


function useBreakSound(state: StopwatchState, setState: React.Dispatch<React.SetStateAction<StopwatchState>>, now: number) {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio("/wine-glass-alarm.ogg");
        }
    }, []);

    useEffect(() => {
        if (!state.isBreak || !state.breakStartedAt || state.breakSoundPlayed) return;
        if (Date.now() - state.breakStartedAt < state.breakAllowedMs) return;

        audioRef.current?.play().catch((e: unknown) => console.error("Sound play failed", e));
        setState((s) => ({ ...s, breakSoundPlayed: true }));
    }, [
        now,
        state.isBreak,
        state.breakStartedAt,
        state.breakAllowedMs,
        state.breakSoundPlayed,
        setState,
    ]);
}

function useMiniTrackerStyles(settings: AppSettings, isDimmed: boolean): React.CSSProperties {
    const baseOpacity =
        settings.trackerOpacity !== undefined
            ? settings.trackerOpacity / 100
            : OPACITY_HOVER;
    const hoverReduction =
        settings.trackerHoverReduction !== undefined
            ? settings.trackerHoverReduction / 100
            : OPACITY_DIM;
    const dimmedOpacity =
        settings.trackerDimmedOpacity !== undefined
            ? settings.trackerDimmedOpacity / 100
            : OPACITY_DIM;

    const style: React.CSSProperties & Record<string, string | number> = {
        "--base-opacity": isDimmed ? dimmedOpacity : baseOpacity,
        "--hover-opacity": isDimmed ? dimmedOpacity : Math.max(0, baseOpacity - hoverReduction),
        "--tracker-font-size": settings.trackerFontSize === "dynamic" 
            ? "min(70cqh, calc(130cqw / var(--text-length, 20)))"
            : (settings.trackerFontSize ? `${settings.trackerFontSize}px` : "15px")
    };
    return style;
}

function getOngoingEvent(events: AppEvent[], tasks: AppTask[], date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 1);
    
    const expanded = expandEventsForView(events, start, end);
    const hydrated = hydrateEvents(expanded, tasks);
    const floatNow = toFloatingIso(date);
    
    const ongoingEvents = hydrated.filter((e) => e.startTime <= floatNow && e.endTime > floatNow && !isEventAllDay(e));
    
    return ongoingEvents.find((e) => e.task) || ongoingEvents[0];
}

function useActiveItem(tasks: AppTask[] | null, events: AppEvent[] | null, now: number) {
    const currentMinute = Math.floor(now / MS_IN_MINUTE);
    
    return React.useMemo(() => {
        const doingTask = tasks?.find((t) => t.status === "doing");
        if (doingTask) return doingTask;

        if (events && tasks && events.length > 0) {
            const date = new Date(currentMinute * MS_IN_MINUTE);
            const bestEvent = getOngoingEvent(events, tasks, date);
            
            if (bestEvent) {
                return bestEvent.task || { title: bestEvent.title };
            }
        }
        
        return undefined;
    }, [tasks, events, currentMinute]);
}

export function MiniTrackerScreen() {
    const [state, setState] = useStopwatch();
    const [tasks] = useTasks();
    const [events] = useEvents();
    const [settings] = useSettings();
    const [now, setNow] = useState(Date.now());
    const [isDimmed, setIsDimmed] = useState(false);

    useEffect(() => {
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";

        return () => {
            document.documentElement.style.background = "";
            document.body.style.background = "";
        };
    }, []);

    useEffect(() => {
        let raf: number;
        const loop = () => {
            setNow(Date.now());
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    useBreakSound(state, setState, now);
    const activeTask = useActiveItem(tasks, events, now);
    const clockStyle = settings.clockStyle || "counter";

    const running = state.runningSince !== undefined;
    const currentMs =
        state.elapsed +
        (running && !state.isBreak && state.runningSince ? now - state.runningSince : 0);


    useMiniTrackerKeybindings(settings.keybindingRestoreApp, setIsDimmed);

    const style = useMiniTrackerStyles(settings, isDimmed);

    useEffect(() => {
        if (window.electronAPI?.setSnapThreshold) {
            window.electronAPI.setSnapThreshold(settings.trackerSnapThreshold ?? 2);
        }
    }, [settings.trackerSnapThreshold]);

    useEffect(() => {
        if (window.electronAPI?.onSnapped) {
            window.electronAPI.onSnapped(() => {
                void import("cuelume").then(({ play }) => play("toggle"));
            });
        }
    }, []);

    const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        window.electronAPI?.startDrag?.(e.clientX, e.clientY);

        let dragging = true;
        const tick = () => {
            if (!dragging) return;
            window.electronAPI?.dragTick?.();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        const onPointerUp = () => {
            dragging = false;
            target.releasePointerCapture(e.pointerId);
            target.removeEventListener("pointerup", onPointerUp);
            window.electronAPI?.endDrag?.();
        };
        target.addEventListener("pointerup", onPointerUp);
    }, []);

    const showBorder = settings.trackerShowBorder ?? true;
    return (
        <div
            className={`minitracker-container ${showBorder ? "show-border" : ""}`}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            style={style satisfies React.CSSProperties}
            title="Double-click to restore main window"
        >
            <MiniTrackerClock
                activeTask={activeTask}
                allowStopwatchWithoutTask={settings.allowStopwatchWithoutTask ?? false}
                clockStyle={clockStyle}
                currentMs={currentMs}
                state={state}
                running={running}
            />
        </div>
    );
}
