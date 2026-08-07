import { MINUTES_IN_HOUR, MS_IN_DAY, DAYS_IN_WEEK } from "./date-utils";

export interface ParsedProperties {
    priority?: number;
    day?: string;
    time?: string;
    duration?: number;
    tags?: string[];
}

export interface Token {
    type: "text" | "sigil";
    text: string;
}

export interface ParseResult {
    cleanTitle: string;
    properties: ParsedProperties;
    tokens: Token[];
}

export function getDueDateFromSigil(day: string, now: Date = new Date()): string {
    const d = day.toLowerCase();
    const today = new Date(now.getTime());
    let addDays = 0;
    
    if (d === 'tom' || d === 'tomorrow') addDays = 1;
    else if (d === 'overmorrow') addDays = 2;
    else {
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const targetIdx = days.indexOf(d);
        if (targetIdx !== -1) {
            const currentIdx = today.getDay();
            addDays = targetIdx - currentIdx;
            if (addDays <= 0) addDays += DAYS_IN_WEEK; // Move to next week if the day has already passed this week
        }
    }
    
    const target = new Date(today.getTime() + addDays * MS_IN_DAY);
    return `${target.getFullYear()}-${(target.getMonth()+1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;
}

const PRIORITY_REGEX = /^(?:\.\.|p0|\.|p1|!|p2|!!|p3|!{3,}|p4)$/i;
const DAY_REGEX = /^(?:mon|tue|wed|thu|fri|sat|sun|tom|tomorrow|overmorrow)$/i;
const TIME_REGEX = /^\d{1,2}(?::\d{2})?(?:am|pm)$/i;
const DURATION_REGEX = /^(?:for|in)?\s*(\d+)(h|hr|m)$/i;
const TAG_REGEX = /^#([\w-]+)$/i;

function getPriorityValue(sigil: string): number | undefined {
    const s = sigil.toLowerCase();
    if (s === ".." || s === "p0") return 0;
    if (s === "." || s === "p1") return 1;
    /* eslint-disable no-magic-numbers */
    if (s === "!" || s === "p2") return 2;
    /* eslint-disable no-magic-numbers */
    if (s === "!!" || s === "p3") return 3;
    /* eslint-disable no-magic-numbers */
    if (s.startsWith("!!!") || s === "p4") return 4;
    return 1; // Default priority if unrecognized sigil
}

function processToken(part: string, properties: ParsedProperties): boolean {
    if (PRIORITY_REGEX.test(part)) {
        properties.priority = getPriorityValue(part);
        return true;
    } else if (DAY_REGEX.test(part)) {
        properties.day = part.toLowerCase();
        return true;
    } else if (TIME_REGEX.test(part)) {
        properties.time = part.toLowerCase();
        return true;
    } else if (DURATION_REGEX.test(part)) {
        const m = part.match(DURATION_REGEX);
        if (m) {
            const val = parseInt(m[1], 10);
            const unit = m[2].toLowerCase();
            properties.duration = unit.startsWith("h") ? val * MINUTES_IN_HOUR : val;
            return true;
        }
    } else if (TAG_REGEX.test(part)) {
        const m = part.match(TAG_REGEX);
        if (m) {
            if (!properties.tags) properties.tags = [];
            properties.tags.push(m[1]);
            return true;
        }
    }
    return false;
}

export function parseSigils(title: string): ParseResult {
    const properties: ParsedProperties = {};
    const tokens: Token[] = [];
    
    // We will find all potential sigils using a regex that splits on whitespace boundaries.
    // However, phrases like "for 8m" or "in 1h" have spaces in them.
    // Let's first tokenize by whitespace.
    const parts = title.split(/(\s+)/);
    const cleanParts: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.trim() === "") {
            tokens.push({ type: "text", text: part });
            continue;
        }
        // Check 2-word sigils like "for 8m" or "in 1h"
        if (i + 2 < parts.length && (part.toLowerCase() === "for" || part.toLowerCase() === "in")) {
            const nextSpace = parts[i+1];
            const nextWord = parts[i+2];
            const combined = part + nextSpace + nextWord;
            const durMatch = combined.match(DURATION_REGEX);
            if (durMatch && durMatch[0] === combined) {
                const val = parseInt(durMatch[1], 10);
                const unit = durMatch[2].toLowerCase();
                properties.duration = unit.startsWith("h") ? val * MINUTES_IN_HOUR : val;
                tokens.push({ type: "sigil", text: combined });
                i += 2;
                continue;
            }
        }

        if (processToken(part, properties)) {
            tokens.push({ type: "sigil", text: part });
        } else {
            tokens.push({ type: "text", text: part });
            cleanParts.push(part);
        }
    }
    
    // cleanTitle should only contain the text parts, properly spaced.
    const cleanTitle = tokens
        .filter(t => t.type === "text")
        .map(t => t.text)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    
    // Group adjacent text tokens
    const mergedTokens: Token[] = [];
    for (const t of tokens) {
        if (mergedTokens.length > 0 && mergedTokens[mergedTokens.length - 1].type === t.type) {
            mergedTokens[mergedTokens.length - 1].text += t.text;
        } else {
            mergedTokens.push({ ...t });
        }
    }

    return { cleanTitle, properties, tokens: mergedTokens };
}
