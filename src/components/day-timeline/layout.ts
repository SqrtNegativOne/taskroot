import type { HydratedEvent } from "../../core/domain/events";

// Simple overlap layout: assign each event to the earliest lane that's free.
export function layoutEvents(events: HydratedEvent[]) {
    const placed: { start: number; end: number; lane: number }[] = [];
    const result: { event: HydratedEvent; lane: number; lanes?: number }[] = [];
    for (const ev of events) {
        let lane = 0;
        while (
            placed.some(
                (p) =>
                    p.lane === lane &&
                    !(p.end <= (ev.start || 0) || p.start >= (ev.end || 0)),
            )
        ) {
            lane++;
        }
        placed.push({ start: ev.start || 0, end: ev.end || 0, lane });
        result.push({ event: ev, lane });
    }
    // Determine total lanes per cluster (events that overlap any chain)
    // For simplicity, use max lanes among overlapping events.
    return result.map((r) => {
        let maxLane = r.lane;
        for (const p of placed) {
            if (!(p.end <= (r.event.start || 0) || p.start >= (r.event.end || 0))) {
                if (p.lane > maxLane) maxLane = p.lane;
            }
        }
        return { ...r, lanes: maxLane + 1 };
    });
}
