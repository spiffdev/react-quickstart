import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaveAndExitDialog from "./SaveAndExitDialog";
import { BundleProvider } from "../hooks/useBundle";

const { account, config } = vi.hoisted(() => ({
    account: { customer: undefined as { emailAddress: string } | undefined },
    config: {} as Record<string, unknown>,
}));

vi.mock("../hooks/useAccount", () => ({ default: () => account }));
vi.mock("../hooks/useThemeConfiguration", () => ({ default: () => config }));
vi.mock("@spiffcommerce/core", () => ({ StakeholderType: { Owner: "Owner", Approver: "Approver" } }));

const makeBundle = (options: { owner?: boolean; name?: string; branding?: boolean } = {}) => ({
    getGlobalPropertyConfiguration: vi.fn(() => (options.branding ? { id: "config-1" } : undefined)),
    convertToTemplate: vi.fn(async (_name: string) => ({})),
    getName: vi.fn(() => options.name),
    setName: vi.fn(async () => {}),
    getAllStakeholders: vi.fn(async () => (options.owner ? [{ type: "Owner" }] : [])),
    addStakeholder: vi.fn(async () => {}),
});

const renderDialog = (bundle: ReturnType<typeof makeBundle>) => {
    const onClose = vi.fn();
    const onSaved = vi.fn(async () => {});
    render(
        <BundleProvider bundle={bundle as never} setBundle={() => {}} startNewBundle={async () => {}}>
            <SaveAndExitDialog onClose={onClose} onSaved={onSaved} />
        </BundleProvider>,
    );
    const save = () => screen.getByRole("button", { name: /save and exit|saving/i }) as HTMLButtonElement;
    return { onClose, onSaved, save };
};

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
    account.customer = undefined;
    for (const key of Object.keys(config)) delete config[key];
});

describe("SaveAndExitDialog", () => {
    describe("for a guest", () => {
        it("asks for an email address, and can't save without a valid one", async () => {
            const bundle = makeBundle();
            const { save } = renderDialog(bundle);
            await screen.findByLabelText(/email address/i);
            expect(save().disabled).toBe(true);
            type(/email address/i, "not an email");
            expect(save().disabled).toBe(true);
            type(/email address/i, "jo@example.com");
            expect(save().disabled).toBe(false);
        });

        it("makes them the owner, then leaves", async () => {
            const bundle = makeBundle();
            const { save, onSaved } = renderDialog(bundle);
            await screen.findByLabelText(/email address/i);
            type(/email address/i, " jo@example.com ");
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
            expect(bundle.addStakeholder).toHaveBeenCalledWith({ emailAddress: "jo@example.com" }, "Owner");
        });

        it("doesn't ask again for a bundle which already has an owner", async () => {
            const bundle = makeBundle({ owner: true });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(screen.queryByLabelText(/email address/i)).toBeNull();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.addStakeholder).not.toHaveBeenCalled();
        });

        it("can't be saved before it's known whether the bundle has an owner", () => {
            const bundle = makeBundle();
            bundle.getAllStakeholders.mockReturnValue(new Promise(() => {}));
            const { save } = renderDialog(bundle);
            expect(save().disabled).toBe(true);
        });
    });

    describe("for a signed in customer", () => {
        beforeEach(() => {
            account.customer = { emailAddress: "jo@example.com" };
        });

        it("saves without asking for anything", async () => {
            const bundle = makeBundle();
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(screen.queryByLabelText(/email address/i)).toBeNull();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.addStakeholder).not.toHaveBeenCalled();
        });
    });

    describe("signing out on exit", () => {
        const checkbox = () => screen.getByLabelText(/sign me out when i exit/i) as HTMLInputElement;

        beforeEach(() => {
            account.customer = { emailAddress: "jo@example.com" };
        });

        it("is offered to a signed in customer, and off to begin with so they stay signed in", async () => {
            const { save } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(checkbox().checked).toBe(false);
        });

        it("keeps them signed in when it's left alone", async () => {
            const { save, onSaved } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ signOut: false }));
        });

        it("signs them out as they leave when they tick it", async () => {
            const { save, onSaved } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            fireEvent.click(checkbox());
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ signOut: true }));
        });

        it("isn't offered to a guest, who has nothing to sign out of", async () => {
            account.customer = undefined;
            const { save, onSaved } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(screen.queryByLabelText(/sign me out/i)).toBeNull();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ signOut: false }));
        });

        describe("when the theme doesn't allow staying signed in", () => {
            beforeEach(() => {
                config.portalAllowStaySignedIn = false;
            });

            it("says they'll be signed out, with no choice to make", async () => {
                const { save } = renderDialog(makeBundle({ owner: true }));
                await waitFor(() => expect(save().disabled).toBe(false));
                expect(screen.queryByLabelText(/sign me out/i)).toBeNull();
                expect(screen.getByText(/you'll be signed out when you exit/i)).toBeTruthy();
            });

            it("always signs them out", async () => {
                const { save, onSaved } = renderDialog(makeBundle({ owner: true }));
                await waitFor(() => expect(save().disabled).toBe(false));
                fireEvent.click(save());
                await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ signOut: true }));
            });

            it("has nothing to say to a guest", async () => {
                account.customer = undefined;
                const { save } = renderDialog(makeBundle({ owner: true }));
                await waitFor(() => expect(save().disabled).toBe(false));
                expect(screen.queryByText(/signed out when you exit/i)).toBeNull();
            });
        });

        it("still lets them stay signed in when the theme allows it explicitly", async () => {
            config.portalAllowStaySignedIn = true;
            const { save } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(checkbox()).toBeTruthy();
        });
    });

    describe("naming the order", () => {
        beforeEach(() => {
            account.customer = { emailAddress: "jo@example.com" };
        });

        it("starts with the bundle's name and only saves it when it has changed", async () => {
            const bundle = makeBundle({ name: "Staff gifts" });
            const { save, onSaved } = renderDialog(bundle);
            expect((screen.getByLabelText(/order name/i) as HTMLInputElement).value).toBe("Staff gifts");
            await waitFor(() => expect(save().disabled).toBe(false));
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.setName).not.toHaveBeenCalled();
        });

        it("saves a new name, trimmed", async () => {
            const bundle = makeBundle({ name: "Staff gifts" });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            type(/order name/i, "  Christmas gifts ");
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.setName).toHaveBeenCalledWith("Christmas gifts");
        });

        it("allows a blank name", async () => {
            const bundle = makeBundle({ name: "Staff gifts" });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            type(/order name/i, "");
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.setName).toHaveBeenCalledWith("");
        });
    });

    it("doesn't leave when saving fails, and says so", async () => {
        account.customer = { emailAddress: "jo@example.com" };
        vi.spyOn(console, "error").mockImplementation(() => {});
        const bundle = makeBundle({ name: "A" });
        bundle.setName.mockRejectedValueOnce(new Error("offline"));
        const { save, onSaved } = renderDialog(bundle);
        await waitFor(() => expect(save().disabled).toBe(false));
        type(/order name/i, "B");
        fireEvent.click(save());
        await screen.findByText(/couldn't save your draft/i);
        expect(onSaved).not.toHaveBeenCalled();
        expect(save().disabled).toBe(false);
    });

    it("can be cancelled", async () => {
        const { onClose } = renderDialog(makeBundle({ owner: true }));
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    describe("saving the branding as a template", () => {
        const tick = () => fireEvent.click(screen.getByLabelText(/also save my branding as a template/i));
        const template = /also save my branding as a template/i;

        beforeEach(() => {
            // A template belongs to a signed in customer.
            account.customer = { emailAddress: "jo@example.com" };
        });

        it("is only offered when the design has shared options", async () => {
            const { save } = renderDialog(makeBundle({ owner: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(screen.queryByLabelText(template)).toBeNull();
        });

        it("isn't offered to a guest, as core only makes templates for a signed in customer", async () => {
            account.customer = undefined;
            renderDialog(makeBundle({ branding: true }));
            await screen.findByLabelText(/email address/i);
            expect(screen.queryByLabelText(template)).toBeNull();
        });

        it("is off to begin with, so a draft is saved without one", async () => {
            const bundle = makeBundle({ owner: true, branding: true });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            expect((screen.getByLabelText(template) as HTMLInputElement).checked).toBe(false);
            expect(screen.queryByText(/saved under the order/i)).toBeNull();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.convertToTemplate).not.toHaveBeenCalled();
        });

        it("needs a name once it's ticked", async () => {
            const { save } = renderDialog(makeBundle({ owner: true, branding: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            expect(save().disabled).toBe(true);
            type(/order name/i, "   ");
            expect(save().disabled).toBe(true);
            type(/order name/i, "Company branding");
            expect(save().disabled).toBe(false);
        });

        it("says why it needs the order's name, until it has one", async () => {
            const { save } = renderDialog(makeBundle({ owner: true, branding: true }));
            await waitFor(() => expect(save().disabled).toBe(false));
            expect(screen.queryByText(/saved under the order/i)).toBeNull();
            tick();
            expect(screen.getByText(/saved under the order/i)).toBeTruthy();
            type(/order name/i, "Company branding");
            expect(screen.queryByText(/saved under the order/i)).toBeNull();
        });

        it("has no name of its own, and uses the name the order already has", async () => {
            const bundle = makeBundle({ owner: true, branding: true, name: "Staff gifts" });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            expect(screen.queryByLabelText(/template name/i)).toBeNull();
            expect(save().disabled).toBe(false);
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.convertToTemplate).toHaveBeenCalledWith("Staff gifts");
            expect(bundle.setName).not.toHaveBeenCalled();
        });

        it("names the order and the template the same thing when the name is typed", async () => {
            const bundle = makeBundle({ owner: true, branding: true });
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            type(/order name/i, "Company branding");
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalled());
            expect(bundle.setName).toHaveBeenCalledWith("Company branding");
            expect(bundle.convertToTemplate).toHaveBeenCalledWith("Company branding");
        });

        it("saves the template, then leaves", async () => {
            const bundle = makeBundle({ owner: true, branding: true });
            const order: string[] = [];
            bundle.convertToTemplate.mockImplementation(async () => void order.push("template") as never);
            const { save, onSaved } = renderDialog(bundle);
            onSaved.mockImplementation(async () => void order.push("exit"));
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            type(/order name/i, " Company branding ");
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
            expect(bundle.convertToTemplate).toHaveBeenCalledWith("Company branding");
            expect(order).toEqual(["template", "exit"]);
        });

        it("stays open when the template can't be saved, and a retry saves it once", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            const bundle = makeBundle({ owner: true, branding: true });
            bundle.convertToTemplate.mockRejectedValueOnce(new Error("offline"));
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            type(/order name/i, "Company branding");
            fireEvent.click(save());
            await screen.findByText(/couldn't save your branding as a template/i);
            expect(onSaved).not.toHaveBeenCalled();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
            expect(bundle.convertToTemplate).toHaveBeenCalledTimes(2);
        });

        it("can be left unticked after a failure to save the draft without it", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            const bundle = makeBundle({ owner: true, branding: true });
            bundle.convertToTemplate.mockRejectedValue(new Error("offline"));
            const { save, onSaved } = renderDialog(bundle);
            await waitFor(() => expect(save().disabled).toBe(false));
            tick();
            type(/order name/i, "Company branding");
            fireEvent.click(save());
            await screen.findByText(/couldn't save your branding as a template/i);
            tick();
            fireEvent.click(save());
            await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        });
    });
});
