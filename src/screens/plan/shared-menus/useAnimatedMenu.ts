import { useState, useCallback } from "react";

export const ANIMATION_DELAY_MS = 150;


export function useAnimatedMenu(closeDelay = ANIMATION_DELAY_MS) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const close = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, closeDelay);
    }, [closeDelay]);

    const open = useCallback(() => {
        setIsOpen(true);
    }, []);

    const toggle = useCallback(() => {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }, [isOpen, close, open]);

    return { isOpen, isClosing, open, close, toggle };
}
