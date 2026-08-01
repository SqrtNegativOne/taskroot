import { MINUTES_IN_HOUR, MS_PER_SECOND, MS_PER_MINUTE } from "../../utils/constants";
import { PAD2 } from "../../../core/store/data";
import type { AppEvent } from "../../../core/domain/models";


export const RANDOM_ID_MULTIPLIER = 10000;

export function createWorkSessionEvent(
    startMs: number,
    endMs: number,
    taskId: string | undefined,
    clockStyle: string,
): AppEvent | undefined {
    if (!startMs || !endMs) return undefined;
    if (endMs - startMs < MS_PER_MINUTE) return undefined; // ignore < 1 min sessions
    return {
        id: `log-${Date.now()}-${Math.floor(Math.random() * RANDOM_ID_MULTIPLIER)}`,
        title: `Worked on ${taskId || "Task"}`,
        type: "time_log" as const,
        startTime: toIsoLocal(new Date(startMs)),
        endTime: toIsoLocal(new Date(endMs)),
        isAllDay: false,
        taskId: taskId || "",
        clockStyle,
    };
}

function toIsoLocal(dt: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}



export function splitTime(ms: number) {
    const totalSec = Math.floor(ms / MS_PER_SECOND);
    const totalMin = Math.floor(totalSec / MINUTES_IN_HOUR);
    return {
        m: PAD2(totalMin),
    };
}
