import { useEffect, useState, useSyncExternalStore } from "react";
import { MEDIA } from "../layout";

/** Tracks whether a media query currently matches. */
export const useMediaQuery = (query: string): boolean =>
    useSyncExternalStore(
        (notify) => {
            const list = window.matchMedia(query);
            list.addEventListener("change", notify);
            return () => list.removeEventListener("change", notify);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );

/** The layout mode and modifiers that JavaScript needs to know about. Prefer CSS media queries where possible. */
export const useLayoutMode = () => ({
    stacked: useMediaQuery(MEDIA.stacked),
    short: useMediaQuery(MEDIA.short),
    compact: useMediaQuery(MEDIA.compact),
});

const isTextEntry = (element: Element | null) =>
    !!element &&
    (element instanceof HTMLTextAreaElement ||
        (element instanceof HTMLInputElement &&
            !["checkbox", "radio", "button", "range", "file"].includes(element.type)) ||
        (element instanceof HTMLElement && element.isContentEditable));

// How much of the screen has to disappear before we assume it was taken by the on-screen keyboard.
const KEYBOARD_MIN_HEIGHT = 150;

/**
 * Reports the height of the visible area while the on-screen keyboard is open for a text field, otherwise undefined.
 * The visual viewport is used because many mobile browsers don't resize the layout viewport for the keyboard.
 */
export const useKeyboardViewportHeight = (): number | undefined => {
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const update = () => {
            const open =
                window.innerHeight - viewport.height > KEYBOARD_MIN_HEIGHT && isTextEntry(document.activeElement);
            setHeight(open ? viewport.height : undefined);
        };
        viewport.addEventListener("resize", update);
        document.addEventListener("focusin", update);
        document.addEventListener("focusout", update);
        return () => {
            viewport.removeEventListener("resize", update);
            document.removeEventListener("focusin", update);
            document.removeEventListener("focusout", update);
        };
    }, []);

    return height;
};
