import { fireEvent, render, screen } from "@testing-library/react";
import { Backdrop, Dialog } from "./dialogParts";

const renderPanel = (onDismiss?: () => void) =>
    render(
        <Backdrop onDismiss={onDismiss}>
            <Dialog role="dialog">
                <input aria-label="Name" />
                <button type="button">Inside</button>
            </Dialog>
        </Backdrop>,
    );

/** The covered part of the screen, which is the panel's parent. */
const covered = () => screen.getByRole("dialog").parentElement as HTMLElement;

describe("Backdrop", () => {
    it("is dismissed by pressing the part of the screen it covers", () => {
        const onDismiss = vi.fn();
        renderPanel(onDismiss);
        fireEvent.mouseDown(covered());
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("isn't dismissed by pressing inside the panel", () => {
        const onDismiss = vi.fn();
        renderPanel(onDismiss);
        fireEvent.mouseDown(screen.getByRole("dialog"));
        fireEvent.mouseDown(screen.getByLabelText("Name"));
        fireEvent.mouseDown(screen.getByRole("button", { name: "Inside" }));
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it("isn't dismissed by letting go outside the panel after pressing inside it, as when selecting text", () => {
        const onDismiss = vi.fn();
        renderPanel(onDismiss);
        fireEvent.mouseDown(screen.getByLabelText("Name"));
        fireEvent.mouseUp(covered());
        fireEvent.click(covered());
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it("is dismissed by Escape, and by no other key", () => {
        const onDismiss = vi.fn();
        renderPanel(onDismiss);
        fireEvent.keyDown(window, { key: "Enter" });
        fireEvent.keyDown(window, { key: "a" });
        expect(onDismiss).not.toHaveBeenCalled();
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("stays when it has nothing to dismiss to", () => {
        renderPanel();
        fireEvent.mouseDown(covered());
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("stops listening for Escape once it has gone", () => {
        const onDismiss = vi.fn();
        const { unmount } = renderPanel(onDismiss);
        unmount();
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
