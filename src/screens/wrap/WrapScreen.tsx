import React, { useState } from "react";
import { TitleBar } from "../../components/shell";
import { TODAY, minutesToHHMM } from "../../core/store/data";
import { useStored, useSettingsStore } from "../../core/store/store";
import { DEFAULT_SETTINGS } from "../../core/store/settingsSchema";
import { DayTimeline } from "../../components/day-timeline";

export function WrapScreen() {
    const [settings] = useSettingsStore(DEFAULT_SETTINGS);
    const [events] = useStored<import('../../core/domain/models').AppEvent[]>("events", []);
    const [tasks] = useStored<import('../../core/domain/models').AppTask[]>("tasks", []);

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({
        good: "",
        bad: "",
        why: "",
        try: "",
    });

    const logEvents = events.filter((e) => e.type === "log");

    // Calculate untracked time
    const wake = settings.earliest_wake_time || 480;
    const sleep = settings.last_sleep_time || 1320;
    const totalDayTime = sleep - wake;
    let trackedTime = 0;
    logEvents.forEach((e) => {
        const start = Math.max(wake, e.start);
        const end = Math.min(sleep, e.end);
        if (end > start) {
            trackedTime += end - start;
        }
    });
    const untrackedTime = Math.max(0, totalDayTime - trackedTime);

    return (
        <div className="app">
            <TitleBar current="wrap" today={TODAY} />
            <div
                className="main"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    padding: "20px",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "800px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                        paddingBottom: "40px",
                    }}
                >
                    <h2>Wrap Up Your Day</h2>

                    {/* Step 1 */}
                    {step >= 1 && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                            }}
                        >
                            <div
                                style={{
                                    height: "400px",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    position: "relative",
                                }}
                            >
                                <DayTimeline
                                    events={logEvents}
                                    tasks={tasks}
                                    today={TODAY}
                                    timelineDate={TODAY}
                                    setTimelineDate={() => {}}
                                    dragState={null}
                                    setDragState={() => {}}
                                    onResizeEvent={() => {}}
                                    onMoveEvent={() => {}}
                                    onEventClick={() => {}}
                                    onAddEvent={() => {}}
                                    onDropToTime={() => {}}
                                    filter={[]}
                                    sort="time"
                                    filterMenu={null}
                                />
                            </div>
                            <p style={{ color: "var(--fg-dim)" }}>
                                Time untracked today:{" "}
                                {Math.floor(untrackedTime / 60)}h{" "}
                                {untrackedTime % 60}m (from{" "}
                                {minutesToHHMM(wake)} to {minutesToHHMM(sleep)})
                            </p>
                            {step === 1 && (
                                <button
                                    style={{
                                        width: "100%",
                                        padding: "20px",
                                        fontSize: "18px",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border)",
                                        cursor: "pointer",
                                        borderRadius: "8px",
                                        marginTop: "10px",
                                        transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                            "var(--accent-soft)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            "var(--bg-surface)")
                                    }
                                    onClick={() => setStep(2)}
                                >
                                    Continue
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 2 */}
                    {step >= 2 && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "20px",
                                marginTop: "20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: "18px",
                                        color: "var(--fg)",
                                    }}
                                >
                                    <span style={{ color: "var(--tag-green)" }}>
                                        +
                                    </span>{" "}
                                    What was good today? (Observation)
                                </label>
                                <textarea
                                    value={answers.good}
                                    onChange={(e) =>
                                        setAnswers({
                                            ...answers,
                                            good: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    style={{
                                        background: "var(--bg-input)",
                                        color: "var(--fg)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: "18px",
                                        color: "var(--fg)",
                                    }}
                                >
                                    <span style={{ color: "var(--tag-red)" }}>
                                        -
                                    </span>{" "}
                                    What was bad today? (Observation)
                                </label>
                                <textarea
                                    value={answers.bad}
                                    onChange={(e) =>
                                        setAnswers({
                                            ...answers,
                                            bad: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    style={{
                                        background: "var(--bg-input)",
                                        color: "var(--fg)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: "18px",
                                        color: "var(--fg)",
                                    }}
                                >
                                    <span
                                        style={{ color: "var(--tag-yellow)" }}
                                    >
                                        ?
                                    </span>{" "}
                                    Why the good/bad things happened?
                                    (Hypothesis)
                                </label>
                                <textarea
                                    value={answers.why}
                                    onChange={(e) =>
                                        setAnswers({
                                            ...answers,
                                            why: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    style={{
                                        background: "var(--bg-input)",
                                        color: "var(--fg)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: "18px",
                                        color: "var(--fg)",
                                    }}
                                >
                                    <span
                                        style={{ color: "var(--tag-purple)" }}
                                    >
                                        !
                                    </span>{" "}
                                    What to try tomorrow? (Experiment)
                                </label>
                                <textarea
                                    value={answers.try}
                                    onChange={(e) =>
                                        setAnswers({
                                            ...answers,
                                            try: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    style={{
                                        background: "var(--bg-input)",
                                        color: "var(--fg)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            <button
                                style={{
                                    width: "100%",
                                    padding: "20px",
                                    fontSize: "18px",
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    cursor: "pointer",
                                    borderRadius: "8px",
                                    marginTop: "10px",
                                    transition: "background 0.2s",
                                    color: "var(--fg)",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                        "rgba(255, 100, 100, 0.2)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        "var(--bg-surface)")
                                }
                                onClick={() => {
                                    if (
                                        window.electronAPI &&
                                        window.electronAPI.shutdownPC
                                    ) {
                                        window.electronAPI.shutdownPC();
                                    } else {
                                        alert("PC would shutdown now!");
                                    }
                                }}
                            >
                                Go to Sleep (Shutdown PC)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
