import { PX_PER_MIN } from "../types";
import { hhmmShort } from "../../../core/store/data";

interface CreationPreviewProps {
    preview: { start: number; end: number } | null;
}

export function CreationPreview({ preview }: CreationPreviewProps) {
    if (!preview) return null;

    return (
        <div
            className="day-event ev-plan is-compact"
            style={{
                top: `${preview.start * PX_PER_MIN}px`,
                height: `${(preview.end - preview.start) * PX_PER_MIN}px`,
                left: "56px",
                width: "calc(100% - 58px)",
                opacity: 0.5,
                pointerEvents: "none",
                zIndex: 10,
            }}
        >
            <div className="day-event-inner">
                <div className="day-event-time">
                    {hhmmShort(preview.start)} – {hhmmShort(preview.end)}
                </div>
                <div className="day-event-title">New Event...</div>
            </div>
        </div>
    );
}
