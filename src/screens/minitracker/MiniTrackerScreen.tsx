// @ts-nocheck
import React, { useState, useEffect } from "react";
import "@fontsource/atkinson-hyperlegible-next";
import { useTasks, useEvents, useStopwatch, useTimeLogs, useSettings, useTaskFilters, useTaskSort } from "../../core/store/hooks";
import { PAD2 } from "../../core/store/data";

function splitTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const totalMin = Math.floor(totalSec / 60);
    return { m: PAD2(totalMin), s: PAD2(totalSec % 60) };
}

export function MiniTrackerScreen() {
    const [state, setState] = useStopwatch();
    const [tasks] = useTasks();
    const [settings] = useStored<Partial<import('../../core/store/settingsSchema').AppSettings>>("settings", {});
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
        let raf;
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
                    .catch((e: React.SyntheticEvent | PointerEvent | Event | unknown) => console.error("Sound play failed", e));
                setState((s: import("../../core/domain/models").AppTask) => ({ ...s, breakSoundPlayed: true }));
            }
        }
    }, [
        now,
        state.isBreak,
        state.breakStartedAt,
        state.breakAllowedMs,
        state.breakSoundPlayed,
    ]);

    const activeTask = tasks?.find((t: import('../../core/domain/models').AppTask) => t.status === "doing");
    const clockStyle = settings.clockStyle || "counter";

    const running = state.runningSince != null;
    const currentMs =
        state.elapsed +
        (running && !state.isBreak ? now - state.runningSince : 0);

    let content = null;

    if (!activeTask && !settings.allowStopwatchWithoutTask) {
        content = <div style={{ color: "var(--fg-dim)" }}>No active task.</div>;
    } else {
        const taskName = activeTask ? activeTask.title : "Work session";

        if (clockStyle === "counter") {
            const { m } = splitTime(currentMs);
            content = (
                <div>
                    <span style={{ fontWeight: "normal" }}>{m}</span> {taskName}
                </div>
            );
        } else if (clockStyle === "flowtime") {
            if (state.isBreak && state.breakStartedAt) {
                const remSecs = Math.max(
                    0,
                    Math.ceil(
                        (state.breakAllowedMs - (now - state.breakStartedAt)) /
                            1000,
                    ),
                );
                const remM = Math.floor(remSecs / 60);
                const remS = remSecs % 60;
                const color = remSecs === 0 ? "var(--red)" : "var(--tag-green)";
                content = (
                    <div style={{ color }}>
                        <span style={{ fontWeight: "normal" }}>
                            {PAD2(remM)}:{PAD2(remS)}
                        </span>{" "}
                        break left
                    </div>
                );
            } else {
                const { m } = splitTime(currentMs);
                content = (
                    <div>
                        <span style={{ fontWeight: "normal" }}>{m}</span>{" "}
                        {taskName}
                    </div>
                );
            }
        } else if (clockStyle === "guzey") {
            const d = new Date(now);
            const h = d.getHours();
            const min = d.getMinutes();
            const isLongBreak = h % 3 === 0;
            let breakState = "WORK";
            let nextMin = 60;

            if (isLongBreak && min < 35) {
                breakState = "BREAK";
                nextMin = 35;
            } else if (min >= 0 && min < 5) {
                breakState = "BREAK";
                nextMin = 5;
            } else if (min >= 5 && min < 30) {
                breakState = "WORK";
                nextMin = 30;
            } else if (min >= 30 && min < 35) {
                breakState = "BREAK";
                nextMin = 35;
            } else {
                breakState = "WORK";
                nextMin = 60;
            }

            let target = new Date(d);
            target.setSeconds(0);
            target.setMilliseconds(0);
            if (nextMin === 60) {
                target.setMinutes(0);
                target.setHours(target.getHours() + 1);
            } else {
                target.setMinutes(nextMin);
            }

            const remainingMs = target.getTime() - d.getTime();
            const remS = Math.floor(remainingMs / 1000);
            const remM = Math.floor(remS / 60);
            const finalS = remS % 60;

            if (!running) {
                content = (
                    <div style={{ color: "var(--fg-dim)" }}>
                        TRACKING PAUSED
                    </div>
                );
            } else if (breakState === "BREAK") {
                content = (
                    <div style={{ color: "var(--tag-green)" }}>
                        {PAD2(remM)}:{PAD2(finalS)} left for break
                    </div>
                );
            } else {
                content = (
                    <div>
                        {PAD2(remM)}:{PAD2(finalS)} left working for {taskName}
                    </div>
                );
            }
        }
    }

    const handleDoubleClick = () => {
        if (window.electronAPI?.restoreMainWindow) {
            window.electronAPI.restoreMainWindow();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const kb = settings.keybindingRestoreApp || "Ctrl+Alt+R";
            const parts = kb.split("+");
            const key = parts.pop();
            const needsCtrl = parts.includes("Ctrl");
            const needsAlt = parts.includes("Alt");
            const needsShift = parts.includes("Shift");
            const needsMeta = parts.includes("Meta");

            const keyMatch =
                e.key.toUpperCase() === key?.toUpperCase() ||
                (e.key === " " && key === "Space");
            if (
                e.ctrlKey === needsCtrl &&
                e.altKey === needsAlt &&
                e.shiftKey === needsShift &&
                e.metaKey === needsMeta &&
                keyMatch
            ) {
                e.preventDefault();
                handleDoubleClick();
            }

            if (
                e.key.toLowerCase() === "h" &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey &&
                !e.shiftKey
            ) {
                setIsDimmed((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [settings.keybindingRestoreApp]);

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
            style={
                {
                    width: "100vw",
                    height: "100vh",
                    background: "rgb(24, 24, 24)",
                    opacity: currentOpacity,
                    border:
                        (settings.trackerShowBorder ?? true)
                            ? "1px solid rgba(255, 255, 255, 0.15)"
                            : "none",
                    transition: "opacity 0.2s ease",
                    color: "var(--fg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Atkinson Hyperlegible Next', monospace",
                    fontSize: "16px",
                    userSelect: "none",
                    WebkitAppRegion: "drag", // allows dragging the window
                    cursor: "default",
                    padding: "16px",
                    boxSizing: "border-box",
                    textAlign: "center",
                }
            }
            title="Double-click to restore main window"
        >
            {content}
        </div>
    );
}
