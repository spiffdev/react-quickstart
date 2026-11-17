import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;

/**
 * Calls `onTimeout` once nothing has happened on the page for `seconds`. Any click, touch, key press or movement
 * starts the wait again, and it only runs while `active`. A wait which is unset or zero never times out.
 *
 * `onTimeout` is always the latest one given, and changing it doesn't restart the wait.
 */
const useInactivityTimeout = (seconds: number | undefined, active: boolean, onTimeout: () => void) => {
    const latest = useRef(onTimeout);
    latest.current = onTimeout;

    useEffect(() => {
        if (!active || !seconds || seconds <= 0) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const restart = () => {
            clearTimeout(timer);
            timer = setTimeout(() => latest.current(), seconds * 1000);
        };
        ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, restart, { passive: true }));
        restart();
        return () => {
            clearTimeout(timer);
            ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, restart));
        };
    }, [active, seconds]);
};

export default useInactivityTimeout;
