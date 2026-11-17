import { act, renderHook } from "@testing-library/react";
import useInactivityTimeout from "./useInactivityTimeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const advance = (seconds: number) => act(() => void vi.advanceTimersByTime(seconds * 1000));

describe("useInactivityTimeout", () => {
    it("calls back once the time has passed with nothing happening", () => {
        const onTimeout = vi.fn();
        renderHook(() => useInactivityTimeout(30, true, onTimeout));
        advance(29);
        expect(onTimeout).not.toHaveBeenCalled();
        advance(1);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("waits again after any activity", () => {
        const onTimeout = vi.fn();
        renderHook(() => useInactivityTimeout(30, true, onTimeout));
        for (const name of ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"]) {
            advance(20);
            act(() => void window.dispatchEvent(new Event(name)));
        }
        expect(onTimeout).not.toHaveBeenCalled();
        advance(30);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("only calls back once until there's more activity", () => {
        const onTimeout = vi.fn();
        renderHook(() => useInactivityTimeout(10, true, onTimeout));
        advance(100);
        expect(onTimeout).toHaveBeenCalledTimes(1);
        act(() => void window.dispatchEvent(new Event("keydown")));
        advance(10);
        expect(onTimeout).toHaveBeenCalledTimes(2);
    });

    it.each([undefined, 0, -5])("never times out when the wait is %s", (seconds) => {
        const onTimeout = vi.fn();
        renderHook(() => useInactivityTimeout(seconds, true, onTimeout));
        advance(10_000);
        expect(onTimeout).not.toHaveBeenCalled();
    });

    it("doesn't run while inactive, and starts when it becomes active", () => {
        const onTimeout = vi.fn();
        const { rerender } = renderHook(({ active }) => useInactivityTimeout(5, active, onTimeout), {
            initialProps: { active: false },
        });
        advance(60);
        expect(onTimeout).not.toHaveBeenCalled();
        rerender({ active: true });
        advance(5);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("stops when it's unmounted or turned off", () => {
        const onTimeout = vi.fn();
        const { rerender, unmount } = renderHook(({ active }) => useInactivityTimeout(5, active, onTimeout), {
            initialProps: { active: true },
        });
        advance(4);
        rerender({ active: false });
        advance(60);
        expect(onTimeout).not.toHaveBeenCalled();
        rerender({ active: true });
        unmount();
        advance(60);
        expect(onTimeout).not.toHaveBeenCalled();
        // And it no longer listens for activity.
        act(() => void window.dispatchEvent(new Event("keydown")));
        advance(60);
        expect(onTimeout).not.toHaveBeenCalled();
    });

    it("calls the latest callback without restarting the wait", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(({ callback }) => useInactivityTimeout(10, true, callback), {
            initialProps: { callback: first },
        });
        advance(6);
        rerender({ callback: second });
        advance(4);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it("restarts the wait when the time is changed", () => {
        const onTimeout = vi.fn();
        const { rerender } = renderHook(({ seconds }) => useInactivityTimeout(seconds, true, onTimeout), {
            initialProps: { seconds: 10 },
        });
        advance(8);
        rerender({ seconds: 20 });
        advance(19);
        expect(onTimeout).not.toHaveBeenCalled();
        advance(1);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });
});
