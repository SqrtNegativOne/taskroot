export const ANIMATION_DELAY_MS = 150;

export const DAYS_IN_WEEK = 7;

export const DateGridView = {
    Month: "month",
    Week: "week",
    OneWeek: "1 week",
    ThreeWeeks: "3 weeks"
} as const;
export type DateGridView = typeof DateGridView[keyof typeof DateGridView];
