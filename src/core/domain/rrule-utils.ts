import { RRule } from "rrule";
import type { AppEvent } from "./models";
import type { HydratedEvent } from "./events";

export type RecurringMode = "instance" | "following" | "all";

export function expandEventsForView(
    baseEvents: AppEvent[],
    viewStartDate: Date,
    viewEndDate: Date,
): HydratedEvent[] {
    const flattenedInstances: HydratedEvent[] = [];

    baseEvents.forEach((event) => {
        if (!event.rrule) {
            flattenedInstances.push(event);
            return;
        }

        try {
            let ruleStr = event.rrule;
            if (!ruleStr.includes("DTSTART")) {
                const dtstart = event.startTime.replace(/[-:]/g, "");
                ruleStr = `DTSTART:${dtstart}\n${ruleStr.startsWith("RRULE:") ? ruleStr : "RRULE:" + ruleStr}`;
            }

            const rule = RRule.fromString(ruleStr);
            const viewStartUTC = new Date(Date.UTC(viewStartDate.getFullYear(), viewStartDate.getMonth(), viewStartDate.getDate()));
            const viewEndUTC = new Date(Date.UTC(viewEndDate.getFullYear(), viewEndDate.getMonth(), viewEndDate.getDate()));
            
            const generatedDates = rule.between(viewStartUTC, viewEndUTC, true);

            const baseStartDt = new Date(event.startTime);
            const baseEndDt = new Date(event.endTime);
            const durationMs = baseEndDt.getTime() - baseStartDt.getTime();

            generatedDates.forEach((date) => {
                const y = date.getUTCFullYear();
                const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
                const d = date.getUTCDate().toString().padStart(2, "0");
                const h = date.getUTCHours().toString().padStart(2, "0");
                const min = date.getUTCMinutes().toString().padStart(2, "0");
                const sec = date.getUTCSeconds().toString().padStart(2, "0");
                const instanceStartTimeStr = `${y}-${m}-${d}T${h}:${min}:${sec}`;

                const isExdate = event.exdates?.some((exdate) => {
                    // Google's exdate format is typically "YYYYMMDDTHHMMSSZ" or "YYYYMMDDTHHMMSS"
                    // Our instanceStartTimeStr is "YYYY-MM-DDTHH:MM:SS"
                    const compactInstanceStr = instanceStartTimeStr.replace(/[-:]/g, "");
                    return exdate.startsWith(compactInstanceStr);
                });

                if (isExdate) return;

                const exceptionOverride = baseEvents.find(
                    (e) =>
                        e.recurringEventId === event.id &&
                        e.originalStartTime === instanceStartTimeStr,
                );

                if (exceptionOverride) {
                    if (!exceptionOverride.cancelled) {
                        flattenedInstances.push(exceptionOverride);
                    }
                } else {
                    // newStartDt in local time so we can add duration and output correctly
                    const newStartDt = new Date(`${y}-${m}-${d}T${h}:${min}:${sec}`);
                    const newEndDt = new Date(newStartDt.getTime() + durationMs);

                    const ey = newEndDt.getFullYear();
                    const em = (newEndDt.getMonth() + 1).toString().padStart(2, "0");
                    const ed = newEndDt.getDate().toString().padStart(2, "0");
                    const eh = newEndDt.getHours().toString().padStart(2, "0");
                    const emin = newEndDt.getMinutes().toString().padStart(2, "0");
                    const esec = newEndDt.getSeconds().toString().padStart(2, "0");
                    const instanceEndTimeStr = `${ey}-${em}-${ed}T${eh}:${emin}:${esec}`;

                    flattenedInstances.push({
                        ...event,
                        id: `${event.id}_${date.getTime()}`,
                        startTime: instanceStartTimeStr,
                        endTime: instanceEndTimeStr,
                        isInstance: true,
                        baseEventId: event.id,
                    });
                }
            });
        } catch (e) {
            console.error(
                "Failed to parse RRULE for event",
                event.title || event.id,
                e,
            );
            flattenedInstances.push(event);
        }
    });

    return flattenedInstances;
}

export function applyRecurringUpdate(
    events: AppEvent[],
    instanceEvent: HydratedEvent,
    mode: RecurringMode,
    updates: Partial<AppEvent>
): AppEvent[] {
    const baseId = instanceEvent.baseEventId || instanceEvent.id;
    const baseEvent = events.find((e) => e.id === baseId);
    if (!baseEvent) return events;

    if (mode === "all") {
        return events.map((e) => (e.id === baseId ? { ...e, ...updates } : e));
    }
    
    if (mode === "instance") {
        if (instanceEvent.recurringEventId) {
             // It's already an exception override, just update it
             return events.map(e => e.id === instanceEvent.id ? { ...e, ...updates } : e);
        }
        
        // Google exdate is YYYYMMDDTHHMMSS (no dashes)
        const compactStartTime = instanceEvent.startTime.replace(/[-:]/g, "");
        const newExdates = [...(baseEvent.exdates || []), compactStartTime];
        
        const overrideEvent: AppEvent = {
            ...baseEvent,
            ...updates,
            id: `e${Date.now()}_${crypto.randomUUID()}`,
            recurringEventId: baseId,
            originalStartTime: instanceEvent.startTime,
            rrule: undefined,
            exdates: undefined,
        };

        return [
            ...events.map((e) => (e.id === baseId ? { ...e, exdates: newExdates } : e)),
            overrideEvent
        ];
    }
    
    if (mode === "following") {
        // Complex, fallback to 'all' for now if user chooses it
        return events.map((e) => (e.id === baseId ? { ...e, ...updates } : e));
    }
    
    return events;
}

export function applyRecurringDelete(
    events: AppEvent[],
    instanceEvent: HydratedEvent,
    mode: RecurringMode
): AppEvent[] {
    const baseId = instanceEvent.baseEventId || instanceEvent.id;
    const baseEvent = events.find((e) => e.id === baseId);
    if (!baseEvent) return events;

    if (mode === "all") {
        return events.filter((e) => e.id !== baseId && e.recurringEventId !== baseId);
    }
    
    if (mode === "instance") {
        if (instanceEvent.recurringEventId) {
             return events.filter(e => e.id !== instanceEvent.id);
        } else {
             const compactStartTime = instanceEvent.startTime.replace(/[-:]/g, "");
             const newExdates = [...(baseEvent.exdates || []), compactStartTime];
             return events.map((e) => (e.id === baseId ? { ...e, exdates: newExdates } : e));
        }
    }
    
    if (mode === "following") {
        return events.filter((e) => e.id !== baseId && e.recurringEventId !== baseId);
    }

    return events;
}
