import { MINUTES_IN_HOUR, MS_PER_SECOND, MS_PER_MINUTE } from "../../utils/constants";
import React from "react";
import { ymd, PAD2 } from "../../../core/store/data";
import type { AppEvent } from "../../../core/domain/models";

export const RANDOM_ID_MULTIPLIER = 10000;


export function logWorkSession(
    setTimeLogs: React.Dispatch<React.SetStateAction<AppEvent[]>>,
    startMs: number,
    endMs: number,
    taskId: string | null | undefined,
    clockStyle: string,
) {
    if (!startMs || !endMs) return;
    if (endMs - startMs < MS_PER_MINUTE) return; // ignore < 1 min sessions
    setTimeLogs((logs) => [
        ...(logs || []),
        {
                    id: `log-${Date.now()}-${Math.floor(Math.random() * RANDOM_ID_MULTIPLIER)}`,
                    title: `Worked on ${taskId || "Task"}`,
                    type: "time_log" as const,
                    start: startMs,
                    end: endMs,
                    taskId: taskId || "",
                    clockStyle,
                    date: ymd(new Date(startMs)),
                },
    ]);
}

export function splitTime(ms: number) {
    const totalSec = Math.floor(ms / MS_PER_SECOND);
    const totalMin = Math.floor(totalSec / MINUTES_IN_HOUR);
    return {
        m: PAD2(totalMin),
    };
}
