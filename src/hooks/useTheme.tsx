import { createContext, FunctionComponent, ReactNode, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import useThemeConfiguration from "./useThemeConfiguration";

/**
 * The values the theme's styling is built from. They match the defaults in `index.css`, which apply until the
 * configured values have been published to the page.
 */
export interface Theme {
    primaryColor: string;
    textColor: string;
    sceneHeadingSize: number;
    stepHeadingSize: number;
}

export const DEFAULT_THEME: Theme = {
    primaryColor: "#007bff",
    textColor: "#212121",
    sceneHeadingSize: 24,
    stepHeadingSize: 18,
};

const FONT_FAMILY_NAME = "SpiffThemeFont";
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

type Rgb = [number, number, number];

const parseHex = (color: string | undefined): Rgb | undefined => {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color?.trim() ?? "");
    if (!match) return undefined;
    const hex = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
};

const toCss = (rgb: Rgb) => `rgb(${rgb.map(Math.round).join(", ")})`;

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
    from.map((channel, index) => channel * (1 - amount) + to[index] * amount) as Rgb;

// Pick whichever of black or white reads better on top of the colour.
const contrastColor = ([red, green, blue]: Rgb) =>
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.6 ? "#000000" : "#ffffff";

const positive = (value: number | undefined, fallback: number) => (value && value > 0 ? value : fallback);

const ThemeContext = createContext<Theme>(DEFAULT_THEME);

/**
 * The resolved styling values, for the rare cases that can't use the CSS variables.
 */
const useTheme = () => useContext(ThemeContext);

/**
 * Publishes the configured styling as CSS variables on the theme's container, where every component picks it up.
 */
export const ThemeProvider: FunctionComponent<{ container: HTMLElement; children: ReactNode }> = ({
    container,
    children,
}) => {
    const configuration = useThemeConfiguration();
    const fontLink = configuration.font?.fileLink ?? undefined;

    const theme = useMemo<Theme>(
        () => ({
            primaryColor: parseHex(configuration.primaryColor)
                ? configuration.primaryColor!
                : DEFAULT_THEME.primaryColor,
            textColor: parseHex(configuration.textColor) ? configuration.textColor! : DEFAULT_THEME.textColor,
            sceneHeadingSize: positive(configuration.sceneHeadingSize, DEFAULT_THEME.sceneHeadingSize),
            stepHeadingSize: positive(configuration.stepHeadingSize, DEFAULT_THEME.stepHeadingSize),
        }),
        [
            configuration.primaryColor,
            configuration.textColor,
            configuration.sceneHeadingSize,
            configuration.stepHeadingSize,
        ],
    );

    const variables = useMemo(() => {
        const primary = parseHex(theme.primaryColor) ?? parseHex(DEFAULT_THEME.primaryColor)!;
        const values: Record<string, string> = {
            "--theme-primary-color": theme.primaryColor,
            "--theme-primary-color-hover": toCss(mix(primary, BLACK, 0.2)),
            "--theme-primary-color-light": toCss(mix(primary, WHITE, 0.5)),
            "--theme-primary-color-lighter": toCss(mix(primary, WHITE, 0.94)),
            "--theme-primary-color-halo": `rgba(${primary.join(", ")}, 0.2)`,
            "--theme-primary-contrast-color": contrastColor(primary),
            "--theme-text-color": theme.textColor,
            "--theme-scene-heading-size": `${theme.sceneHeadingSize}px`,
            "--theme-step-heading-size": `${theme.stepHeadingSize}px`,
        };
        if (parseHex(configuration.backgroundColor)) {
            values["--theme-background-color"] = configuration.backgroundColor!;
        }
        if (fontLink) {
            values["--theme-font-family"] = `"${FONT_FAMILY_NAME}", var(--Default-Font, sans-serif)`;
        }
        return values;
    }, [configuration.backgroundColor, fontLink, theme]);

    // Layout effect so the configured styling is in place before the first paint.
    useLayoutEffect(() => {
        Object.entries(variables).forEach(([name, value]) => container.style.setProperty(name, value));
        return () => {
            Object.keys(variables).forEach((name) => container.style.removeProperty(name));
        };
    }, [container, variables]);

    useEffect(() => {
        if (!fontLink) return;
        const style = document.createElement("style");
        style.textContent = `@font-face { font-family: "${FONT_FAMILY_NAME}"; src: url("${fontLink.replace(/"/g, "%22")}"); }`;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, [fontLink]);

    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export default useTheme;
