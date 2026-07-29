import React, { useState, useRef } from "react";

export const SPLIT_PANE_THRESHOLD_PX = 50;
export const SIDEBAR_DEFAULT_WIDTH_PX = 360;


function useSplitPane(direction: "horizontal" | "vertical", defaultSize: number, snapThreshold: number) {
    const [size, setSize] = useState(defaultSize);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isHoriz = direction === "horizontal";

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        if (e.target instanceof Element) e.target.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let newSize;
        if (isHoriz) {
            newSize = e.clientX - rect.left;
        } else {
            newSize = e.clientY - rect.top;
        }

        if (newSize < snapThreshold) newSize = 0;

        const maxSize = isHoriz ? rect.width : rect.height;
        if (newSize > maxSize - snapThreshold) newSize = maxSize;

        setSize(newSize);
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false);
        if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
    };

    return { size, isDragging, containerRef, onPointerDown, onPointerMove, onPointerUp, isHoriz };
}

function getContainerStyle(isHoriz: boolean, isDragging: boolean): React.CSSProperties {
    return {
        display: "flex",
        flexDirection: isHoriz ? "row" : "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: isDragging ? "none" : "auto",
    };
}

function getFirstChildStyle(isHoriz: boolean, size: number, minSize: number): React.CSSProperties {
    return {
        [isHoriz ? "width" : "height"]: size,
        [isHoriz ? "minWidth" : "minHeight"]: size > 0 ? minSize : 0,
        display: size === 0 ? "none" : "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
    };
}

function getDividerStyle(isHoriz: boolean, isDragging: boolean): React.CSSProperties {
    return {
        [isHoriz ? "width" : "height"]: "6px",
        [isHoriz ? "marginLeft" : "marginTop"]: "-3px",
        [isHoriz ? "marginRight" : "marginBottom"]: "-3px",
        cursor: isHoriz ? "col-resize" : "row-resize",
        flexShrink: 0,
        zIndex: 10,
        position: "relative",
        pointerEvents: "auto",
        backgroundColor: isDragging ? "var(--accent)" : "transparent",
        transition: "background-color 0.15s ease",
    };
}

const secondChildStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
};

export function SplitPane({
    direction = "horizontal",
    defaultSize = SIDEBAR_DEFAULT_WIDTH_PX,
    minSize = 100,
    snapThreshold = SPLIT_PANE_THRESHOLD_PX,
    children,
}: {
    direction?: "horizontal" | "vertical";
    defaultSize?: number;
    minSize?: number;
    snapThreshold?: number;
    children: React.ReactNode;
}) {
    const { size, isDragging, containerRef, onPointerDown, onPointerMove, onPointerUp, isHoriz } = useSplitPane(direction, defaultSize, snapThreshold);

    const childArray = React.Children.toArray(children);
    const firstChild = childArray[0];
    const secondChild = childArray[1];

    return (
        <div ref={containerRef} style={getContainerStyle(isHoriz, isDragging)}>
            <div style={getFirstChildStyle(isHoriz, size, minSize)}>
                {firstChild}
            </div>

            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={getDividerStyle(isHoriz, isDragging)}
                className="split-pane-divider"
            />

            <div style={secondChildStyle}>
                {secondChild}
            </div>
        </div>
    );
}
