import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GuestEmailDialog from "./GuestEmailDialog";

// Signing in is another component's business.
vi.mock("./AccountDialog", () => ({ SignIn: () => <div>sign in form</div> }));

const renderDialog = (onEmailProvided = vi.fn(async () => {})) => {
    const onContinueAsGuest = vi.fn();
    render(
        <GuestEmailDialog
            enforceLogin={false}
            onEmailProvided={onEmailProvided}
            onContinueAsGuest={onContinueAsGuest}
        />,
    );
    return { onEmailProvided, onContinueAsGuest };
};

describe("GuestEmailDialog", () => {
    it("asks for an email address, and won't take one without a domain ending", async () => {
        const { onEmailProvided } = renderDialog();
        fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jo@example" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        expect(await screen.findByText(/valid email address/i)).toBeTruthy();
        expect(onEmailProvided).not.toHaveBeenCalled();
    });

    it("hands over a good one", async () => {
        const { onEmailProvided } = renderDialog();
        fireEvent.change(screen.getByLabelText("Email address"), { target: { value: " jo@example.com " } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        await waitFor(() => expect(onEmailProvided).toHaveBeenCalledWith("jo@example.com"));
    });

    it("carries on as a guest with the button, and by clicking away or pressing Escape, which is the same", () => {
        const { onContinueAsGuest } = renderDialog();
        fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
        fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onContinueAsGuest).toHaveBeenCalledTimes(3);
    });

    it("can't be clicked away from while it's saving the email address", async () => {
        let finish: () => void = () => {};
        const { onContinueAsGuest } = renderDialog(vi.fn(() => new Promise<void>((resolve) => (finish = resolve))));
        fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jo@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        await waitFor(() => expect(screen.getByRole("button", { name: /saving/i })).toBeTruthy());
        fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onContinueAsGuest).not.toHaveBeenCalled();
        finish();
    });
});
