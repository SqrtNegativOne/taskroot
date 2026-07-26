import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icon";

export function MoreScreensDropdown() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOutsideClick = (e: PointerEvent) => {
            if (
                dropdownRef.current &&
                e.target instanceof Node &&
                !dropdownRef.current.contains(e.target)
            ) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen)
            document.addEventListener("pointerdown", handleOutsideClick);
        return () =>
            document.removeEventListener("pointerdown", handleOutsideClick);
    }, [dropdownOpen]);

    return (
        <div className="more-screens-dropdown" ref={dropdownRef}>
            <button
                className={`stage dropdown-btn ${dropdownOpen ? "is-current" : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="More screens"
                data-cuelume-hover="tick"
                data-cuelume-toggle
            >
                <Icon name="keyboard_arrow_down" size={18} />
            </button>
            {dropdownOpen && (
                <div className="dropdown-menu">
                    {["wrap", "graph", "stats", "recap"].map((screen) => (
                        <button
                            key={screen}
                            className="dd-item"
                            onClick={() => {
                                setDropdownOpen(false);
                                navigate(`/${screen}`);
                            }}
                            data-cuelume-hover="tick"
                            data-cuelume-toggle
                        >
                            <span className="stage-name">{screen}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
