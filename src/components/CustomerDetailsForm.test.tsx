import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomerDetailsForm from "./CustomerDetailsForm";

const customer = { emailAddress: "jo@example.com", firstName: "Jo", lastName: "Smith", phoneNumber: "0400 000 000" };

const renderForm = (overrides: Partial<typeof customer> = {}, onSave = vi.fn(async () => {})) => {
    render(<CustomerDetailsForm customer={{ ...customer, ...overrides }} onSave={onSave} />);
    return { onSave, save: () => screen.getByRole("button", { name: /save|saving/i }) as HTMLButtonElement };
};

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("CustomerDetailsForm", () => {
    it("starts with the customer's details, and their email address which can't be changed", () => {
        renderForm();
        const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
        expect(email.value).toBe("jo@example.com");
        expect(email.disabled).toBe(true);
        expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe("Jo");
        expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe("Smith");
        expect((screen.getByLabelText(/phone number/i) as HTMLInputElement).value).toBe("0400 000 000");
    });

    it("is blank for details the customer hasn't given", () => {
        renderForm({ firstName: undefined, lastName: undefined, phoneNumber: undefined } as never);
        expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe("");
    });

    it("hands over all of the details, changed or not, as an update isn't partial", async () => {
        const { onSave, save } = renderForm();
        type(/first name/i, "Joanne");
        fireEvent.click(save());
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                firstName: "Joanne",
                lastName: "Smith",
                phoneNumber: "0400 000 000",
            }),
        );
    });

    it("says when it has saved, until something is changed again", async () => {
        const { save } = renderForm();
        fireEvent.click(save());
        await waitFor(() => expect(save().textContent).toBe("Saved ✓"));
        type(/last name/i, "Jones");
        expect(save().textContent).toBe("Save");
    });

    it("shows that it's saving, and can't be saved twice at once", async () => {
        let finish: () => void = () => {};
        const { onSave, save } = renderForm(
            {},
            vi.fn(() => new Promise<void>((resolve) => (finish = resolve))),
        );
        fireEvent.click(save());
        await waitFor(() => expect(save().textContent).toBe("Saving..."));
        expect(save().disabled).toBe(true);
        expect(onSave).toHaveBeenCalledTimes(1);
        finish();
        await waitFor(() => expect(save().textContent).toBe("Saved ✓"));
    });

    it("says when it couldn't save, and can try again", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const onSave = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
        const { save } = renderForm({}, onSave);
        fireEvent.click(save());
        await screen.findByText(/couldn't save your details/i);
        expect(save().disabled).toBe(false);
        fireEvent.click(save());
        await waitFor(() => expect(save().textContent).toBe("Saved ✓"));
        expect(screen.queryByText(/couldn't save your details/i)).toBeNull();
    });
});
