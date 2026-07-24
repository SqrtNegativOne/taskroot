import { RRule } from "rrule";
import type { AppEvent } from "./events";

export function expandEventsForView(
    baseEvents: AppEvent[],
    viewStartDate: Date,
    viewEndDate: Date,
) {
    const flattenedInstances: AppEvent[] = [];

    baseEvents.forEach((event) => {
        if (!event.rrule) {
            flattenedInstances.push(event);
            return;
        }

        try {
            const rule = RRule.fromString(event.rrule);
            // RRule works with UTC inherently unless adjusted, we should pass Date objects
            // representing the local time, but rrule.js usually prefers UTC dates for local calculations.
            // For simplicity, we just use the viewStartDate and viewEndDate directly.
            const generatedDates = rule.between(
                viewStartDate,
                viewEndDate,
                true,
            );

            generatedDates.forEach((date) => {
                // Simple string format YYYY-MM-DD
                const y = date.getFullYear();
                const m = (date.getMonth() + 1).toString().padStart(2, "0");
                const d = date.getDate().toString().padStart(2, "0");
                const dateStr = `${y}-${m}-${d}`;

                const exceptionOverride = baseEvents.find(
                    (e) =>
                        e.recurringEventId === event.id &&
                        e.originalStartDate === dateStr,
                );

                if (exceptionOverride) {
                    if (!exceptionOverride.cancelled) {
                        flattenedInstances.push(exceptionOverride);
                    }
                } else {
                    // If the event spans multiple days (endDate !== date), we should preserve duration.
                    // In this simple implementation, we just shift date and endDate.
                    let newEndDate = dateStr;
                    if (event.endDate && event.endDate !== event.date) {
                        const startDt = new Date(event.date);
                        const endDt = new Date(event.endDate);
                        const diffDays = Math.round(
                            (endDt.getTime() - startDt.getTime()) /
                                (1000 * 3600 * 24),
                        );

                        const newEndDt = new Date(date.getTime());
                        newEndDt.setDate(newEndDt.getDate() + diffDays);
                        const ey = newEndDt.getFullYear();
                        const em = (newEndDt.getMonth() + 1)
                            .toString()
                            .padStart(2, "0");
                        const ed = newEndDt
                            .getDate()
                            .toString()
                            .padStart(2, "0");
                        newEndDate = `${ey}-${em}-${ed}`;
                    }

                    flattenedInstances.push({
                        ...event,
                        id: `${event.id}_${date.getTime()}`,
                        date: dateStr,
                        endDate: newEndDate,
                        isInstance: true,
                        baseEventId: event.id,
                    } as AppEvent);
                }
            });
        } catch (e) {
            console.error(
                "Failed to parse RRULE for event",
                event.title || event.id,
                e,
            );
            // Fallback: just show the base event if rule is invalid
            flattenedInstances.push(event);
        }
    });

    return flattenedInstances;
}
