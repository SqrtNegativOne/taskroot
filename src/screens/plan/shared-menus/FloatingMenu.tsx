import { ReactNode } from "react";
import "./shared-menus.css";

interface FloatingMenuProps {
    isClosing: boolean;
    align?: "left" | "right";
    minWidth?: string;
    children: ReactNode;
}

export function FloatingMenu({ isClosing, align = "left", minWidth = "200px", children }: FloatingMenuProps) {
    return (
        <div
            className={`shared-floating-menu ${isClosing ? "is-closing" : ""} align-${align}`}
            style={{ minWidth }}
        >
            {children}
        </div>
    );
}
