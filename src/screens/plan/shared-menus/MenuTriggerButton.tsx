import { Icon } from "../../../components/icon";
import "./shared-menus.css";

interface MenuTriggerButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    badgeCount?: number;
}

export function MenuTriggerButton({ isActive, onClick, icon, title, badgeCount }: MenuTriggerButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`menu-trigger-button ${isActive ? "is-active" : ""}`}
            title={title}
        >
            <Icon name={icon} size={16} />
            {badgeCount !== undefined && badgeCount > 0 && (
                <span className="menu-trigger-badge">{badgeCount}</span>
            )}
        </button>
    );
}
