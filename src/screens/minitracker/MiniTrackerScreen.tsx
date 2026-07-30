import React, { useState, useEffect } from "react";
import "@fontsource-variable/roboto-mono";
import { useTasks, useStopwatch, useSettings } from "../../core/store/hooks";
import "./minitracker.css";
import { MiniTrackerClock } from "./MiniTrackerClock";

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


export function MiniTrackerScreen() {
    const [state, setState] = useStopwatch();
    const [tasks] = useTasks();
    const [settings] = useSettings();
    const [now, setNow] = useState(Date.now());
    const [isHovered, setIsHovered] = useState(false);
    const [isDimmed, setIsDimmed] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";

        if (!audioRef.current) {
            audioRef.current = new Audio("/wine-glass-alarm.ogg");
        }

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

    const activeTask = tasks?.find((t: import('../../core/domain/models').AppTask) => t.status === "doing");
    const clockStyle = settings.clockStyle || "counter";

    const running = state.runningSince !== undefined;
    const currentMs =
        state.elapsed +
        (running && !state.isBreak && state.runningSince ? now - state.runningSince : 0);


    useMiniTrackerKeybindings(settings.keybindingRestoreApp, setIsDimmed);

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

    let currentOpacity = baseOpacity;
    if (isDimmed) {
        currentOpacity = dimmedOpacity;
    } else if (isHovered) {
        currentOpacity = Math.max(0, baseOpacity - hoverReduction);
    }

    useEffect(() => {
        if (window.electronAPI?.setSnapThreshold) {
            window.electronAPI.setSnapThreshold(settings.trackerSnapThreshold ?? 2);
        }
    }, [settings.trackerSnapThreshold]);

    useEffect(() => {
        if (window.electronAPI?.onSnapped) {
            window.electronAPI.onSnapped(() => {
                import("cuelume").then(({ play }) => play("toggle"));
            });
        }
    }, []);

    const showBorder = settings.trackerShowBorder ?? true;
    return (
        <div
            className={`minitracker-container ${showBorder ? "show-border" : ""}`}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ opacity: currentOpacity }}
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
