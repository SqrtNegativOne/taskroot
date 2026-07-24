import { useEffect } from "react";
import type { AppTask } from "../../core/domain/models";

export function useStopwatchKeyboard(
    selectorOpen: boolean,
    setSelectorOpen: (val: boolean | ((prev: boolean) => boolean)) => void,
    actionsRef: React.MutableRefObject<any>,
    activeTask: AppTask | null | undefined,
    allowNoTask: boolean
) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.matches(
                    "input:not(.task-search-input), textarea, [contenteditable]",
                )
            )
                return;

            if (e.code === "Space" && !selectorOpen) {
                e.preventDefault();
                actionsRef.current.toggle();
            } else if (e.code === "KeyR" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                actionsRef.current.reset();
            } else if (e.code === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setSelectorOpen((prev: boolean) => !prev);
            } else if (e.code === "Escape" && selectorOpen) {
                if (activeTask || allowNoTask) {
                    e.preventDefault();
                    setSelectorOpen(false);
                }
            }
        };

        const pressed = new Set<string>();
        const handleDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.matches(
                    "input:not(.task-search-input), textarea, [contenteditable]",
                )
            )
                return;
            pressed.add(e.code);
            if (pressed.has("ShiftLeft") && pressed.has("ShiftRight")) {
                e.preventDefault();
                actionsRef.current.startBreak();
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
