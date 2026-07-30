import chroma from "chroma-js";

export function modernizeColor(hex: string): string {
    if (!hex) return hex;
    try {
        const color = chroma(hex);
        // Slightly desaturate and darken to mimic modern UI palettes
        // Google's Material Design often mutes highly saturated legacy colors.
        return color.desaturate(0.4).darken(0.1).hex();
    } catch (e) {
        return hex; // Fallback if invalid color
    }
}
