import type { HydratedEvent } from "../../core/domain/events";

export interface DayLayoutEvent {
    event: HydratedEvent;
    startMins: number;
    endMins: number;
}

// Simple overlap layout: assign each event to the earliest lane that's free.
export function layoutEvents(events: DayLayoutEvent[]) {
    const placed: { start: number; end: number; lane: number }[] = [];
    const result: { event: HydratedEvent; startMins: number; endMins: number; lane: number; lanes?: number }[] = [];
    for (const ev of events) {
        let lane = 0;
        while (
            placed.some(
                (p) =>
                    p.lane === lane &&
                    !(p.end <= ev.startMins || p.start >= ev.endMins),
            )
        ) {
            lane++;
        }
        placed.push({ start: ev.startMins, end: ev.endMins, lane });
        result.push({ event: ev.event, startMins: ev.startMins, endMins: ev.endMins, lane });
    }
    // Determine total lanes per cluster (events that overlap any chain)
    // For simplicity, use max lanes among overlapping events.
    return result.map((r) => {
        let maxLane = r.lane;
        for (const p of placed) {
            if (!(p.end <= r.startMins || p.start >= r.endMins)) {
                if (p.lane > maxLane) maxLane = p.lane;
            }
        }
        return Object.assign({}, r, { lanes: maxLane + 1 });
    });
}
