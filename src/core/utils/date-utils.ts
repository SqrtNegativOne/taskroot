export const HOURS_IN_DAY = 24;
export const MINUTES_IN_HOUR = 60;
export const SECONDS_IN_MINUTE = 60;
export const MILLISECONDS_IN_SECOND = 1000;

export const MS_IN_MINUTE = SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;
export const MS_IN_HOUR = MINUTES_IN_HOUR * MS_IN_MINUTE;
export const MS_IN_DAY = HOURS_IN_DAY * MS_IN_HOUR;
export const DAYS_IN_WEEK = 7;
export const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR;

const ISO_DATE_LENGTH = 10;
const ISO_TIME_START = 11;
export const ISO_HM_END = 16;
const ISO_TIME_END = 19;

/**
 * Adds a specific number of days to a Date object.
 */
export function addDays(date: Date, days: number = 1): Date {
    return new Date(date.getTime() + days * MS_IN_DAY);
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO-like date string.
 * @param isoString String in the format YYYY-MM-DDTHH:MM...
 */
export function extractDateFromISO(isoString: string): string {
    return isoString.substring(0, ISO_DATE_LENGTH);
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO-like date string.
 * @param isoString String in the format YYYY-MM-DDTHH:MM...
 */
export function formatDateToISO(date: Date): string {
    return date.toISOString();
}

const PAD2 = (n: number) => n.toString().padStart(2, "0");

/**
 * Extracts the local date components of a Date object and formats them as a floating ISO string.
 * Example: 2026-08-02T09:00:00 (Notice there is no 'Z' or timezone offset)
 */
export function toFloatingIso(dt: Date): string {
    return `${dt.getFullYear()}-${PAD2(dt.getMonth() + 1)}-${PAD2(dt.getDate())}T${PAD2(dt.getHours())}:${PAD2(dt.getMinutes())}:${PAD2(dt.getSeconds())}`;
}

/**
 * Extracts the time portion (HH:MM:SS) from an ISO-like date string.
 * @param isoString String in the format YYYY-MM-DDTHH:MM:SS
 */
export function extractTimeFromISO(isoString: string): string {
    return isoString.substring(ISO_TIME_START, ISO_TIME_END);
}

/**
 * Extracts the hour and minute portion (HH:MM) from an ISO-like date string.
 * @param isoString String in the format YYYY-MM-DDTHH:MM...
 */
export function extractHourMinuteFromISO(isoString: string): string {
    return isoString.substring(ISO_TIME_START, ISO_HM_END);
}