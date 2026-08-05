import type { NavigateFunction } from "react-router-dom";

export const parseKeybinding = (kb: string) => {
    const parts = kb.split("+");
    const key = parts.pop();
    return {
        key,
        needsCtrl: parts.includes("Ctrl"),
        needsAlt: parts.includes("Alt"),
        needsShift: parts.includes("Shift"),
        needsMeta: parts.includes("Meta"),
    };
};

export function isInputEvent(e: KeyboardEvent) {
    if (!(e.target instanceof HTMLElement)) return false;
    return e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;
}

export function isKeyMatch(e: KeyboardEvent, parsedKb: { key: string | undefined, needsCtrl: boolean, needsAlt: boolean, needsShift: boolean, needsMeta: boolean }) {
    const { key, needsCtrl, needsAlt, needsShift, needsMeta } = parsedKb;
    const keyMatch = e.key.toUpperCase() === key?.toUpperCase() || (e.key === " " && key === "Space");
    return e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift && e.metaKey === needsMeta && keyMatch;
}

export const handleSettingsKeydown = (
    e: KeyboardEvent,
    settingsKb: string,
    navigate: NavigateFunction,
) => {
    if (isInputEvent(e) && !e.ctrlKey && !e.metaKey && !e.altKey)
        return;

    const parsedKb = parseKeybinding(settingsKb || "Ctrl+,");

    if (isKeyMatch(e, parsedKb)) {
        e.preventDefault();
        navigate("/settings");
    }
};
