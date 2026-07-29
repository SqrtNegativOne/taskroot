import type { AppTask, AppEvent } from "../../../core/domain/models";
import type { AppSettings } from "../../../core/store/settingsSchema";

export interface ClockDisplayData {
    primaryText: string;
    secondaryText?: string;
    color?: string;
    showPlayIcon?: boolean;
    isBreak?: boolean;
}

export interface StopwatchState {
    elapsed: number;
    runningSince: number | null;
    isBreak: boolean;
    breakAllowedMs: number;
    breakStartedAt: number | null;
    breakSoundPlayed: boolean;
}

export interface StopwatchContext {
    currentMs?: number;
    running?: boolean;
    isPristine?: boolean;
    toggle?: () => void;
    startSession?: () => void;
    stopSession?: () => void;
    reset?: () => void;
    currentTask?: AppTask | null;
    state: StopwatchState;
    setState?: React.Dispatch<React.SetStateAction<StopwatchState>>;
    timeLogs?: AppEvent[] | null;
    setTimeLogs?: React.Dispatch<React.SetStateAction<AppEvent[] | null>> | React.Dispatch<React.SetStateAction<AppEvent[]>>;
    setSelectorOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    activeTask?: AppTask | null;
    onBreakStatus?: (status: boolean) => void;
    allowNoTask?: boolean;
    settings?: Partial<AppSettings>;
    selectorOpen?: boolean;
    [key: string]: unknown;
}
