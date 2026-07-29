import { HOURS_PER_DAY } from "../core/utils/constants";
import React from "react";

interface IconProps {
    name: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

const defaultStyle: React.CSSProperties = {};

export function Icon({
    name,
    size = HOURS_PER_DAY,
    className = "",
    style = defaultStyle,
}: IconProps) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={{ fontSize: size, ...style }}
        >
            {name}
        </span>
    );
}
