
import React, { useState, useEffect } from "react";
import "@fontsource/atkinson-hyperlegible-next";
import { useTasks, useStopwatch, useSettings } from "../../core/store/hooks";
import { CLOCK_STRATEGIES } from "../../core/domain/clock-strategies";



function getMiniTrackerContainerStyle(currentOpacity: number, showBorder: boolean): React.CSSProperties {
    return {
        width: "100vw",
        height: "100vh",
        background: "rgb(24, 24, 24)",
        opacity: currentOpacity,
        boxShadow: showBorder ? "inset 0 0 0 2px rgba(255, 255, 255, 0.3)" : "none",
        border: showBorder ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
        transition: "opacity 0.2s ease",
        color: "var(--fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Atkinson Hyperlegible Next', monospace",
        fontSize: "16px",
        userSelect: "none",
        // @ts-expect-error valid electron property
        WebkitAppRegion: "drag", // allows dragging the window
        cursor: "default",
        padding: "16px",
        boxSizing: "border-box",
        textAlign: "center",
    };
}
function isRestoreShortcut(e: KeyboardEvent, keybindingRestoreApp: string | undefined) {
    const kb = keybindingRestoreApp || "Ctrl+Alt+R";
    const parts = kb.split("+");
    const key = parts.pop();
    const needsCtrl = parts.includes("Ctrl");
    const needsAlt = parts.includes("Alt");
    const needsShift = parts.includes("Shift");
    const needsMeta = parts.includes("Meta");

    const keyMatch =
        e.key.toUpperCase() === key?.toUpperCase() ||
        (e.key === " " && key === "Space");
        
    return e.ctrlKey === needsCtrl &&
           e.altKey === needsAlt &&
           e.shiftKey === needsShift &&
           e.metaKey === needsMeta &&
           keyMatch;
}

function isDimShortcut(e: KeyboardEvent) {
    return e.key.toLowerCase() === "h" &&
           !e.ctrlKey &&
           !e.altKey &&
           !e.metaKey &&
           !e.shiftKey;
}

function getClockContent(
    activeTask: any,
    allowStopwatchWithoutTask: boolean,
    clockStyle: string,
    currentMs: number,
    state: any,
    running: boolean
) {
    if (!activeTask && !allowStopwatchWithoutTask) {
        return <div style={{ color: "var(--fg-dim)" }}>No active task.</div>;
    }
    
    const taskName = activeTask ? activeTask.title : "Work session";
    const strategy = CLOCK_STRATEGIES[clockStyle] || CLOCK_STRATEGIES.counter;
    
    const data = strategy.getDisplayData({
        currentMs,
        running,
        state,
        isPristine: false,
        setState: () => {},
        setTimeLogs: () => {},
        setSelectorOpen: () => {},
    } as any);

    if (data.secondaryText === "TRACKING PAUSED") {
        return <div style={{ color: data.color }}>TRACKING PAUSED</div>;
    }

    let suffix = taskName;
    if (data.secondaryText === "BREAK" || data.secondaryText === "LONG_BREAK") {
        suffix = "left for break";
    } else if (data.secondaryText === "WORK") {
        suffix = `left working for ${taskName}`;
    }

    return (
        <div style={{ color: data.color || "inherit" }}>
            <span style={{ fontWeight: "normal" }}>{data.primaryText}</span>
            {" "}
            {suffix}
        </div>
    );
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
            }

            if (isDimShortcut(e)) {
                setIsDimmed((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [keybindingRestoreApp, setIsDimmed]);
}


const handleDoubleClick = () => {
    if (window.electronAPI?.restoreMainWindow) {
        window.electronAPI.restoreMainWindow();
    }
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
        if (state.isBreak && state.breakStartedAt && !state.breakSoundPlayed) {
            if (Date.now() - state.breakStartedAt >= state.breakAllowedMs) {
                audioRef.current
                    ?.play()
                    .catch((e: any) => console.error("Sound play failed", e));
                setState((s: any) => ({ ...s, breakSoundPlayed: true }));
            }
        }
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

    const running = state.runningSince != null;
    const currentMs =
        state.elapsed +
        (running && !state.isBreak && state.runningSince ? now - state.runningSince : 0);

    const content = getClockContent(
        activeTask,
        settings.allowStopwatchWithoutTask ?? false,
        clockStyle,
        currentMs,
        state,
        running
    );



    useMiniTrackerKeybindings(settings.keybindingRestoreApp, setIsDimmed);

    const baseOpacity =
        settings.trackerOpacity !== undefined
            ? settings.trackerOpacity / 100
            : 0.8;
    const hoverReduction =
        settings.trackerHoverReduction !== undefined
            ? settings.trackerHoverReduction / 100
            : 0.2;
    const dimmedOpacity =
        settings.trackerDimmedOpacity !== undefined
            ? settings.trackerDimmedOpacity / 100
            : 0.2;

    let currentOpacity = baseOpacity;
    if (isDimmed) {
        currentOpacity = dimmedOpacity;
    } else if (isHovered) {
        currentOpacity = Math.max(0, baseOpacity - hoverReduction);
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={getMiniTrackerContainerStyle(currentOpacity, settings.trackerShowBorder ?? true)}
            title="Double-click to restore main window"
        >
            {content}
        </div>
    );
}
