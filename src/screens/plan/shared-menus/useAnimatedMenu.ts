import { useState, useCallback } from "react";

export function useAnimatedMenu(closeDelay = 150) {
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
