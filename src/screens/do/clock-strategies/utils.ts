import React from "react";
import { ymd, PAD2 } from "../../../core/store/data";
import type { AppEvent } from "../../../core/domain/models";

export function logWorkSession(
    setTimeLogs: React.Dispatch<React.SetStateAction<AppEvent[]>>,
    startMs: number,
    endMs: number,
    taskId: string | null | undefined,
    clockStyle: string,
) {
    if (!startMs || !endMs) return;
    if (endMs - startMs < 60000) return; // ignore < 1 min sessions
    setTimeLogs((logs) => [
        ...(logs || []),
        {
            id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            title: `Worked on ${taskId || "Task"}`,
            type: "time_log" as const,
            start: startMs,
            end: endMs,
            taskId: taskId || "",
            clockStyle,
            date: ymd(new Date(startMs)),
        } as AppEvent,
    ]);
}

export function splitTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const totalMin = Math.floor(totalSec / 60);
    return {
        m: PAD2(totalMin),
    };
}
