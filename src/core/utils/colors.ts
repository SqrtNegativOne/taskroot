import chroma from "chroma-js";

const DESATURATION_AMOUNT = 0.4;
const DARKENING_AMOUNT = 0.8;

export function modernizeColor(hex: string): string {
    if (!hex) return hex;
    try {
        const color = chroma(hex);
        // Slightly desaturate and darken to mimic modern UI palettes
        // Google's Material Design often mutes highly saturated legacy colors.
        return color.desaturate(DESATURATION_AMOUNT).darken(DARKENING_AMOUNT).hex();
    } catch {
        return hex; // Fallback if invalid color
    }
}
