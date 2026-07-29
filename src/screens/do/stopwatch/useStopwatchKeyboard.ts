import { useEffect } from "react";
import type { AppTask } from "../../../core/domain/models";

export interface StopwatchActions {
    toggle: () => void;
    reset: () => void;
    startBreak: () => void;
}

const isInputTarget = (target: EventTarget | null) => {
    return target instanceof Element && target.matches(
        "input:not(.task-search-input), textarea, [contenteditable]",
    );
};

export interface StopwatchKeyboardOptions {
    selectorOpen: boolean;
    setSelectorOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
    actions: StopwatchActions;
    activeTask: AppTask | null | undefined;
    allowNoTask: boolean;
}

export function useStopwatchKeyboard(options: StopwatchKeyboardOptions) {
    const { selectorOpen, setSelectorOpen, actions, activeTask, allowNoTask } = options;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isInputTarget(e.target)) return;

            const isModifier = e.metaKey || e.ctrlKey;

            switch (e.code) {
                case "Space":
                    if (!selectorOpen) {
                        e.preventDefault();
                        actions.toggle();
                    }
                    break;
                case "KeyR":
                    if (isModifier) {
                        e.preventDefault();
                        actions.reset();
                    }
                    break;
                case "Enter":
                    if (isModifier) {
                        e.preventDefault();
                        setSelectorOpen((prev: boolean) => !prev);
                    }
                    break;
                case "Escape":
                    if (selectorOpen && (activeTask || allowNoTask)) {
                        e.preventDefault();
                        setSelectorOpen(false);
                    }
                    break;
            }
        };

        const pressed = new Set<string>();
        const handleDown = (e: KeyboardEvent) => {
            if (isInputTarget(e.target)) return;
            pressed.add(e.code);
            if (pressed.has("ShiftLeft") && pressed.has("ShiftRight")) {
                e.preventDefault();
                actions.startBreak();
            }
        };
        const handleUp = (e: KeyboardEvent) => {
            pressed.delete(e.code);
        };

        window.addEventListener("keydown", handleDown);
        window.addEventListener("keyup", handleUp);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", handleDown);
            window.removeEventListener("keyup", handleUp);
            window.removeEventListener("keydown", onKey);
        };
    }, [selectorOpen, activeTask, allowNoTask, actions, setSelectorOpen]);
}
