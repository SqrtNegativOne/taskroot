import { MINUTES_IN_HOUR } from "../../../core/utils/constants";
import { PX_PER_MIN } from "../types";
import { hhmmShort } from "../../../core/store/data";
import type { DragStateTarget } from "../types";

interface DropPreviewProps {
    target?: DragStateTarget;
}

export function DropPreview({ target }: DropPreviewProps) {
    if (!target || target.minute === undefined) return;

    return (
        <div
            className="day-drop-preview"
            style={{
                top: `${target.minute * PX_PER_MIN}px`,
                height: `${(target.duration || MINUTES_IN_HOUR) * PX_PER_MIN}px`,
            }}
        >
            <span className="day-drop-preview-label">
                ▸ {hhmmShort(target.minute)} –{" "}
                {hhmmShort(target.minute + (target.duration || MINUTES_IN_HOUR))}
            </span>
        </div>
    );
}
