/**
 * The single source of truth for responsive layout.
 *
 * Orientation decides the layout mode (stacked or split) and width decides the size tier, which controls density.
 *
 *  - Stacked: preview on top, steps below. Portrait, or anything narrower than SPLIT_MIN_WIDTH.
 *  - Split:   preview beside the steps. Landscape and at least SPLIT_MIN_WIDTH wide.
 *
 *  - Compact:  phones (< 600)
 *  - Medium:   tablets in portrait and phones in landscape (600 - 1023)
 *  - Expanded: tablets in landscape, laptops and desktops (>= 1024)
 *
 * Short (height <= 500) is a modifier for phones in landscape, which have very little vertical room.
 */
export const COMPACT_MAX_WIDTH = 599;
export const MEDIUM_MAX_WIDTH = 1023;
export const SPLIT_MIN_WIDTH = 700;
export const SHORT_MAX_HEIGHT = 500;

export const MEDIA = {
    stacked: `(orientation: portrait), (max-width: ${SPLIT_MIN_WIDTH - 1}px)`,
    split: `(orientation: landscape) and (min-width: ${SPLIT_MIN_WIDTH}px)`,
    compact: `(max-width: ${COMPACT_MAX_WIDTH}px)`,
    medium: `(min-width: ${COMPACT_MAX_WIDTH + 1}px) and (max-width: ${MEDIUM_MAX_WIDTH}px)`,
    expanded: `(min-width: ${MEDIUM_MAX_WIDTH + 1}px)`,
    short: `(max-height: ${SHORT_MAX_HEIGHT}px)`,
    /** Touch screens, where controls need larger targets. */
    coarse: `(pointer: coarse)`,
} as const;

/** The bounds of the sidebar in split layouts, whatever percentage is configured. */
export const SIDEBAR_MIN_WIDTH = 360;
export const SIDEBAR_MIN_WIDTH_TOUCH = 400;
export const SIDEBAR_MAX_WIDTH = 560;
