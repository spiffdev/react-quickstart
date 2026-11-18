import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccountProvider, default as useAccount } from "./useAccount";
import { BundleProvider } from "./useBundle";
import { ClientProvider } from "./useClient";

const { config, globalPropertyState } = vi.hoisted(() => ({
    config: {} as Record<string, unknown>,
    globalPropertyState: vi.fn(),
}));

vi.mock("./useThemeConfiguration", () => ({ default: () => config }));
vi.mock("@spiffcommerce/core", () => ({
    StakeholderType: { Owner: "Owner", Approver: "Approver" },
    getGlobalPropertyStateForBundle: globalPropertyState,
}));

const customer = { emailAddress: "jo@example.com", firstName: "Jo", partner: { id: "partner-1" } };

const makeClient = (overrides: Record<string, unknown> = {}) => {
    const current: { customer?: typeof customer } = {};
    const client = {
        reloadLoggedInCustomer: vi.fn(async () => !!current.customer),
        getCustomer: vi.fn(() => current.customer),
        getIntegration: vi.fn(async () => ({ partner: { id: "partner-1" } })),
        generateVerificationCode: vi.fn(async () => {}),
        verifyCode: vi.fn(async () => {
            current.customer = customer;
            return true;
        }),
        logOut: vi.fn(async () => {
            current.customer = undefined;
        }),
        getExistingBundle: vi.fn(),
        duplicateBundle: vi.fn(),
        updateCustomer: vi.fn(async (details: Record<string, string | undefined>) => ({ ...customer, ...details })),
        ...overrides,
    };
    return { client, signInOnLoad: () => (current.customer = customer) };
};

const makeBundle = (
    options: { owner?: boolean; experiences?: number; metadata?: [string, string][]; name?: string } = {},
) => {
    const state = { name: options.name, purchaseOrder: undefined as string | undefined };
    return {
        getAllStakeholders: vi.fn(async () => (options.owner ? [{ type: "Owner", customer }] : [])),
        addStakeholder: vi.fn(async () => {}),
        getWorkflowExperiences: vi.fn(() => Array.from({ length: options.experiences ?? 0 })),
        getMetadata: vi.fn(() => new Map(options.metadata ?? [])),
        setMetadata: vi.fn(async (_metadata: Map<string, string>) => {}),
        applyGlobalPropertyState: vi.fn(async () => {}),
        getName: () => state.name,
        setName: vi.fn(async (value: string) => void (state.name = value)),
        getPurchaseOrder: () => state.purchaseOrder,
        setPurchaseOrder: vi.fn(async (value: string) => void (state.purchaseOrder = value)),
        getDispatchDate: () => undefined,
        setDispatchDate: vi.fn(async () => {}),
    };
};

type FakeClient = ReturnType<typeof makeClient>["client"];
type FakeBundle = ReturnType<typeof makeBundle>;

const setup = (client: FakeClient, bundle: FakeBundle) => {
    const setBundle = vi.fn();
    const startNewBundle = vi.fn(async () => {});
    const wrapper = ({ children, bundle: current = bundle }: { children?: ReactNode; bundle?: FakeBundle }) => (
        <ClientProvider client={client as never}>
            <BundleProvider bundle={current as never} setBundle={setBundle} startNewBundle={startNewBundle}>
                <AccountProvider>{children}</AccountProvider>
            </BundleProvider>
        </ClientProvider>
    );
    const view = renderHook(() => useAccount(), { wrapper });
    return { ...view, setBundle, startNewBundle };
};

beforeEach(() => {
    for (const key of Object.keys(config)) delete config[key];
    config.enableUserPortal = true;
    globalPropertyState.mockReset();
});

describe("when the portal is off", () => {
    it("does nothing: no session is restored and the bundle isn't touched", async () => {
        config.enableUserPortal = false;
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const bundle = makeBundle();
        const { result } = setup(client, bundle);
        expect(result.current.enabled).toBe(false);
        await Promise.resolve();
        expect(client.reloadLoggedInCustomer).not.toHaveBeenCalled();
        expect(bundle.addStakeholder).not.toHaveBeenCalled();
    });
});

describe("restoring a session", () => {
    it("signs the customer back in and attaches them to the bundle", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const bundle = makeBundle();
        const { result } = setup(client, bundle);
        await waitFor(() => expect(result.current.customer).toEqual(customer));
        await waitFor(() =>
            expect(bundle.addStakeholder).toHaveBeenCalledWith(
                { emailAddress: "jo@example.com", firstName: "Jo", lastName: undefined, phoneNumber: undefined },
                "Owner",
            ),
        );
    });

    it("leaves a bundle which already has an owner alone", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const bundle = makeBundle({ owner: true });
        const { result } = setup(client, bundle);
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await waitFor(() => expect(bundle.getAllStakeholders).toHaveBeenCalled());
        expect(bundle.addStakeholder).not.toHaveBeenCalled();
    });

    it("signs out a customer who belongs to another partner", async () => {
        const { client, signInOnLoad } = makeClient({
            getIntegration: vi.fn(async () => ({ partner: { id: "someone-else" } })),
        });
        signInOnLoad();
        const { result } = setup(client, makeBundle());
        await waitFor(() => expect(client.logOut).toHaveBeenCalled());
        expect(result.current.customer).toBeUndefined();
    });

    it("carries on when the integration can't be checked", async () => {
        const { client, signInOnLoad } = makeClient({
            getIntegration: vi.fn(async () => {
                throw new Error("offline");
            }),
        });
        signInOnLoad();
        const { result } = setup(client, makeBundle());
        await waitFor(() => expect(result.current.customer).toBeDefined());
        expect(client.logOut).not.toHaveBeenCalled();
    });
});

describe("signing in", () => {
    it("accepts a good code, and attaches the bundle to the customer", async () => {
        const { client } = makeClient();
        const bundle = makeBundle();
        const { result } = setup(client, bundle);
        let accepted: boolean | undefined;
        await act(async () => {
            accepted = await result.current.submitVerificationCode("jo@example.com", "123456");
        });
        expect(accepted).toBe(true);
        expect(client.verifyCode).toHaveBeenCalledWith("jo@example.com", "123456");
        expect(result.current.customer?.emailAddress).toBe("jo@example.com");
        await waitFor(() => expect(bundle.addStakeholder).toHaveBeenCalledTimes(1));
    });

    it("rejects a bad code without signing anyone in", async () => {
        const { client } = makeClient({
            verifyCode: vi.fn(async () => {
                throw new Error("bad code");
            }),
        });
        const bundle = makeBundle();
        const { result } = setup(client, bundle);
        vi.spyOn(console, "error").mockImplementation(() => {});
        let accepted: boolean | undefined;
        await act(async () => {
            accepted = await result.current.submitVerificationCode("jo@example.com", "000000");
        });
        expect(accepted).toBe(false);
        expect(result.current.customer).toBeUndefined();
        expect(bundle.addStakeholder).not.toHaveBeenCalled();
    });

    it("asks the server to send the code", async () => {
        const { client } = makeClient();
        const { result } = setup(client, makeBundle());
        await act(() => result.current.sendVerificationCode("jo@example.com"));
        expect(client.generateVerificationCode).toHaveBeenCalledWith("jo@example.com");
    });
});

describe("updating the customer's details", () => {
    it("sends the whole set of details and shows what the server returns", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const { result } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await act(() =>
            result.current.updateDetails({ firstName: " Joanne ", lastName: "Smith", phoneNumber: " 0400 000 000 " }),
        );
        expect(client.updateCustomer).toHaveBeenCalledWith({
            firstName: "Joanne",
            lastName: "Smith",
            phoneNumber: "0400 000 000",
        });
        expect(result.current.customer).toMatchObject({
            emailAddress: "jo@example.com",
            firstName: "Joanne",
            lastName: "Smith",
        });
    });

    it("clears a detail which has been emptied, as an update isn't partial", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const { result } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await act(() => result.current.updateDetails({ firstName: "Jo", lastName: "  ", phoneNumber: "" }));
        expect(client.updateCustomer).toHaveBeenCalledWith({
            firstName: "Jo",
            lastName: undefined,
            phoneNumber: undefined,
        });
    });

    it("keeps the customer as they were when the update fails", async () => {
        const { client, signInOnLoad } = makeClient({
            updateCustomer: vi.fn(async () => {
                throw new Error("offline");
            }),
        });
        signInOnLoad();
        const { result } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await expect(
            act(() => result.current.updateDetails({ firstName: "Jo", lastName: "", phoneNumber: "" })),
        ).rejects.toThrow("offline");
        expect(result.current.customer).toEqual(customer);
    });
});

describe("signing out and starting over", () => {
    it("signs out and replaces the bundle so the next customer doesn't see the design", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const { result, startNewBundle } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await act(() => result.current.signOut());
        expect(client.logOut).toHaveBeenCalled();
        expect(startNewBundle).toHaveBeenCalledTimes(1);
        expect(result.current.customer).toBeUndefined();
    });

    it("can sign out without starting a new bundle, for when the experience is closing", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const { result, startNewBundle } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await act(() => result.current.signOut({ startNewBundle: false }));
        expect(client.logOut).toHaveBeenCalledTimes(1);
        expect(startNewBundle).not.toHaveBeenCalled();
        expect(result.current.customer).toBeUndefined();
    });

    it("resets without signing out when nobody is signed in", async () => {
        const { client } = makeClient();
        const { result, startNewBundle } = setup(client, makeBundle());
        await act(() => result.current.resetSession());
        expect(client.logOut).not.toHaveBeenCalled();
        expect(startNewBundle).toHaveBeenCalledTimes(1);
    });

    it("signs out when resetting a signed in session", async () => {
        const { client, signInOnLoad } = makeClient();
        signInOnLoad();
        const { result, startNewBundle } = setup(client, makeBundle({ owner: true }));
        await waitFor(() => expect(result.current.customer).toBeDefined());
        await act(() => result.current.resetSession());
        expect(client.logOut).toHaveBeenCalledTimes(1);
        expect(startNewBundle).toHaveBeenCalledTimes(1);
    });
});

describe("opening a draft", () => {
    it("loads it in place of the current bundle", async () => {
        const draft = makeBundle();
        const { client } = makeClient({ getExistingBundle: vi.fn(async () => draft) });
        const { result, setBundle } = setup(client, makeBundle());
        await act(() => result.current.openDraft("draft-1"));
        expect(client.getExistingBundle).toHaveBeenCalledWith("draft-1", undefined, undefined, { test: undefined });
        expect(setBundle).toHaveBeenCalledWith(draft);
    });

    it("keeps test orders as test bundles", async () => {
        config.enableTestOrders = true;
        const { client } = makeClient({ getExistingBundle: vi.fn(async () => makeBundle()) });
        const { result } = setup(client, makeBundle());
        await act(() => result.current.openDraft("draft-1"));
        expect(client.getExistingBundle).toHaveBeenCalledWith("draft-1", undefined, undefined, { test: true });
    });

    it("keeps the current bundle when the draft can't be loaded", async () => {
        const { client } = makeClient({
            getExistingBundle: vi.fn(async () => {
                throw new Error("gone");
            }),
        });
        const { result, setBundle } = setup(client, makeBundle());
        await expect(act(() => result.current.openDraft("draft-1"))).rejects.toThrow("gone");
        expect(setBundle).not.toHaveBeenCalled();
    });
});

describe("duplicating an order", () => {
    const duplicating = (copy: FakeBundle) => makeClient({ duplicateBundle: vi.fn(async () => async () => copy) });

    it("copies the order, designs included, and works on the copy", async () => {
        const copy = makeBundle();
        const { client } = duplicating(copy);
        const { result, setBundle } = setup(client, makeBundle());
        await act(() => result.current.duplicateBundle("order-1"));
        expect(client.duplicateBundle).toHaveBeenCalledWith("order-1", false, true, { test: undefined });
        expect(setBundle).toHaveBeenCalledWith(copy);
        expect(copy.setName).not.toHaveBeenCalled();
    });

    it("records only the order details the partner asks for before switching to the copy", async () => {
        config.portalOrderName = "required";
        config.portalPurchaseOrder = "off";
        const copy = makeBundle();
        const { client } = duplicating(copy);
        const { result, setBundle } = setup(client, makeBundle());
        await act(() =>
            result.current.duplicateBundle("order-1", {
                name: "Staff gifts",
                purchaseOrder: "PO-1",
                dispatchDate: "",
            }),
        );
        expect(copy.setName).toHaveBeenCalledWith("Staff gifts");
        expect(copy.setPurchaseOrder).not.toHaveBeenCalled();
        expect(setBundle).toHaveBeenCalledWith(copy);
    });

    it("doesn't switch to the copy when its details couldn't be saved", async () => {
        config.portalOrderName = "optional";
        const copy = makeBundle();
        copy.setName.mockRejectedValueOnce(new Error("offline"));
        const { client } = duplicating(copy);
        const { result, setBundle } = setup(client, makeBundle());
        await expect(
            act(() =>
                result.current.duplicateBundle("order-1", { name: "Staff gifts", purchaseOrder: "", dispatchDate: "" }),
            ),
        ).rejects.toThrow("offline");
        expect(setBundle).not.toHaveBeenCalled();
    });
});

describe("the default template", () => {
    const withDefaultTemplate = () => {
        const { client, signInOnLoad } = makeClient({
            getExistingBundle: vi.fn(async () => ({ getName: () => "Company branding" })),
        });
        const signedIn = signInOnLoad();
        (signedIn as { defaultTemplateBundleId?: string }).defaultTemplateBundleId = "template-1";
        return client;
    };

    afterEach(() => {
        delete (customer as { defaultTemplateBundleId?: string }).defaultTemplateBundleId;
    });

    it("is applied to the customer's new bundle, and named in its metadata", async () => {
        globalPropertyState.mockResolvedValue({ aspects: ["a"] });
        const bundle = makeBundle({ owner: true });
        setup(withDefaultTemplate(), bundle);
        await waitFor(() => expect(bundle.applyGlobalPropertyState).toHaveBeenCalledWith({ aspects: ["a"] }));
        await waitFor(() => expect(bundle.setMetadata).toHaveBeenCalled());
        const saved = bundle.setMetadata.mock.calls[0][0];
        expect(saved.get("template")).toBe("Company branding");
    });

    it("isn't applied to a bundle which already has designs", async () => {
        globalPropertyState.mockResolvedValue({ aspects: [] });
        const bundle = makeBundle({ owner: true, experiences: 2 });
        const { result } = setup(withDefaultTemplate(), bundle);
        await waitFor(() => expect(result.current.customer).toBeDefined());
        expect(globalPropertyState).not.toHaveBeenCalled();
        expect(bundle.applyGlobalPropertyState).not.toHaveBeenCalled();
    });

    it("isn't applied over branding the customer has already chosen", async () => {
        const bundle = makeBundle({ owner: true, metadata: [["template", "Their own"]] });
        const { result } = setup(withDefaultTemplate(), bundle);
        await waitFor(() => expect(result.current.customer).toBeDefined());
        expect(bundle.applyGlobalPropertyState).not.toHaveBeenCalled();
    });

    it("does nothing when the template has no shared options", async () => {
        globalPropertyState.mockResolvedValue(undefined);
        const bundle = makeBundle({ owner: true });
        setup(withDefaultTemplate(), bundle);
        await waitFor(() => expect(globalPropertyState).toHaveBeenCalled());
        expect(bundle.applyGlobalPropertyState).not.toHaveBeenCalled();
        expect(bundle.setMetadata).not.toHaveBeenCalled();
    });

    it("is only tried once for a bundle, even if it fails", async () => {
        globalPropertyState.mockRejectedValue(new Error("offline"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        const bundle = makeBundle({ owner: true });
        const view = setup(withDefaultTemplate(), bundle);
        await waitFor(() => expect(globalPropertyState).toHaveBeenCalledTimes(1));
        view.rerender();
        await Promise.resolve();
        expect(globalPropertyState).toHaveBeenCalledTimes(1);
    });
});
