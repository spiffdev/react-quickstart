const CUSTOM_COLOR = "#custom";

// The same rainbow Beeline uses to represent the "custom color" option.
export const CUSTOM_COLOR_BACKGROUND =
    "linear-gradient(134.32deg, #FF0000 7.65%, #FF8A00 18.45%, #FFE600 29.25%, #14FF00 40.37%, #00A3FF 49.97%, #0500FF 61.29%, #AD00FF 71.91%, #FF00C7 82.71%, #FF0000 93.34%)";

export const isCustomColor = (value: string | undefined) => value?.toLowerCase() === CUSTOM_COLOR;

/**
 * The CSS background for a color swatch. The special "#custom" value isn't a real color, so it gets the rainbow.
 */
export const swatchBackground = (value: string | undefined, fallback = "#cccccc") =>
    isCustomColor(value) ? CUSTOM_COLOR_BACKGROUND : value || fallback;
