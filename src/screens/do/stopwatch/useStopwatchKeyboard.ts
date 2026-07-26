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

export function useStopwatchKeyboard(
    selectorOpen: boolean,
    setSelectorOpen: (val: boolean | ((prev: boolean) => boolean)) => void,
    actionsRef: React.MutableRefObject<StopwatchActions | null>,
    activeTask: AppTask | null | undefined,
    allowNoTask: boolean
) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isInputTarget(e.target)) return;

            const isModifier = e.metaKey || e.ctrlKey;

            switch (e.code) {
                case "Space":
                    if (!selectorOpen) {
                        e.preventDefault();
                        actionsRef.current?.toggle();
                    }
                    break;
                case "KeyR":
                    if (isModifier) {
                        e.preventDefault();
                        actionsRef.current?.reset();
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
                actionsRef.current?.startBreak();
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
    }, [selectorOpen, activeTask, allowNoTask, actionsRef, setSelectorOpen]);
}
