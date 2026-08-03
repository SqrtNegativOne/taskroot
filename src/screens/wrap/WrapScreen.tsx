import { useState } from "react";
import { MS_PER_MINUTE } from "../../core/utils/constants";

import { useEvents, useSettings } from "../../core/store/hooks";
import type { HydratedEvent } from "../../core/domain/events";
import { WrapTimelineStep } from "./WrapTimelineStep";
import { WrapReflectionStep, type ReflectionAnswers } from "./WrapReflectionStep";
import "./wrap.css";

const MINUTES_IN_22_HOURS = 1320;
const DEFAULT_WORKDAY_MINUTES = 480;


function calculateUntrackedTime(logEvents: HydratedEvent[], wake: number, sleep: number) {
    const totalDayTime = sleep - wake;
    let trackedTime = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    
    logEvents.forEach((e) => {
        const eStart = new Date(e.startTime).getTime();
        const eEnd = new Date(e.endTime).getTime();
        const startMin = (eStart - todayMs) / MS_PER_MINUTE;
        const endMin = (eEnd - todayMs) / MS_PER_MINUTE;
        
        const start = Math.max(wake, startMin);
        const end = Math.min(sleep, endMin);
        if (end > start) {
            trackedTime += end - start;
        }
    });
    
    return Math.max(0, totalDayTime - trackedTime);
}

const handleSleep = () => {
    if (window.electronAPI && window.electronAPI.shutdownPC) {
        window.electronAPI.shutdownPC();
    } else {
        alert("PC would shutdown now!");
    }
};

export function WrapScreen() {
    const [settings] = useSettings();
    const [events] = useEvents();

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState<ReflectionAnswers>({
        good: "",
        bad: "",
        why: "",
        try: "",
    });

    const logEvents: HydratedEvent[] = events
        .filter((e) => e.type === "time_log")
        .map((e) => ({
            id: e.id,
            title: e.title || "",
            startTime: e.startTime,
            endTime: e.endTime,
            type: "time_log",
        }));

    const wake = settings.earliest_wake_time || DEFAULT_WORKDAY_MINUTES;
    const sleep = settings.last_sleep_time || MINUTES_IN_22_HOURS;
    const untrackedTime = calculateUntrackedTime(logEvents, wake, sleep);

    return (
        <>
            <div className="main wrap-container">
                <div className="wrap-content">
                    <h2>Wrap Up Your Day</h2>
                    
                    {step >= 1 && (
                        <WrapTimelineStep
                            logEvents={logEvents}
                            untrackedTime={untrackedTime}
                            wake={wake}
                            sleep={sleep}
                            isActive={step === 1}
                            onContinue={() => setStep(2)}
                        />
                    )}

                    {step >= 2 && (
                        <WrapReflectionStep
                            answers={answers}
                            setAnswers={setAnswers}
                            onSleep={handleSleep}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
