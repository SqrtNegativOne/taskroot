import type { AppTask } from "../../../core/domain/models";
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
    runningSince?: number | undefined;
    isBreak: boolean;
    breakAllowedMs: number;
    breakStartedAt?: number | undefined;
    breakSoundPlayed: boolean;
}

export interface ClockActionEffect {
    newState?: Partial<StopwatchState>;
    shouldLogSession?: boolean;
    selectorOpen?: boolean;
}

export interface ReadonlyStopwatchContext {
    state: StopwatchState;
    currentMs: number;
    isPristine: boolean;
    running: boolean;
    activeTask?: AppTask;
    allowNoTask?: boolean;
    settings?: Partial<AppSettings>;
}
