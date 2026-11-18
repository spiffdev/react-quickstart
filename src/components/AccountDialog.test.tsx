import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountDialog from "./AccountDialog";
import { BundleProvider } from "../hooks/useBundle";
import { ClientProvider } from "../hooks/useClient";

const { account } = vi.hoisted(() => ({
    account: {
        customer: { emailAddress: "jo@example.com" } as { emailAddress: string } | undefined,
        openDraft: vi.fn(async () => {}),
        duplicateBundle: vi.fn(async () => {}),
    },
}));

vi.mock("../hooks/useAccount", () => ({ default: () => account }));
vi.mock("../hooks/useThemeConfiguration", () => ({ default: () => ({}) }));
// No presentment currency, so no prices.
vi.mock("../hooks/useCurrency", () => ({ default: () => undefined }));
vi.mock("@spiffcommerce/core", () => ({
    assetConfigurationDeleteMutation: {},
    assetConfigurationsQuery: {},
    assetService: {},
    getProductCollections: vi.fn(async () => []),
    getTransformedAssetURL: vi.fn(),
    graphQlManager: {},
    StakeholderType: { Owner: "Owner" },
}));

const bundle = (overrides: Record<string, unknown> = {}) => ({
    id: "bundle-1",
    name: "Staff gifts",
    createdAt: new Date(2026, 10, 20, 12).toISOString(),
    updatedAt: new Date(2026, 10, 21, 12).toISOString(),
    productsCount: 2,
    transactionsCount: 3,
    ...overrides,
});

const renderDialog = (pages: Record<string, unknown>[][], initialPage: "drafts" | "orders" = "drafts") => {
    const getBundlesForCustomer = vi.fn(async () => ({ items: pages.shift() ?? [], total: 25 }));
    const current = { getId: () => "current", getGlobalPropertyConfiguration: () => undefined };
    const onClose = vi.fn();
    render(
        <ClientProvider client={{ getBundlesForCustomer } as never}>
            <BundleProvider bundle={current as never} setBundle={() => {}} startNewBundle={async () => {}}>
                <AccountDialog initialPage={initialPage} onClose={onClose} onTemplateApplied={() => {}} />
            </BundleProvider>
        </ClientProvider>,
    );
    return { getBundlesForCustomer, onClose };
};

beforeEach(() => {
    account.customer = { emailAddress: "jo@example.com" };
    account.openDraft.mockClear();
});

describe("AccountDialog's drafts", () => {
    it("asks for the customer's unordered bundles which aren't templates", async () => {
        const { getBundlesForCustomer } = renderDialog([[bundle()]]);
        await screen.findByText("Staff gifts");
        expect(getBundlesForCustomer).toHaveBeenCalledWith({ ordered: false, template: false, limit: 10, offset: 0 });
    });

    it("lists every bundle it's given, empty ones included", async () => {
        renderDialog([
            [
                bundle({ id: "a", name: "Staff gifts", transactionsCount: 3 }),
                bundle({ id: "b", name: "Empty one", transactionsCount: 0, productsCount: 0 }),
                bundle({ id: "c", name: "No counts", transactionsCount: undefined, productsCount: undefined }),
                bundle({ id: "d", name: "Null counts", transactionsCount: null, productsCount: null }),
            ],
        ]);
        for (const name of ["Staff gifts", "Empty one", "No counts", "Null counts"]) {
            expect(await screen.findByText(name)).toBeTruthy();
        }
        expect(screen.queryByText(/you have no drafts yet/i)).toBeNull();
    });

    it("shows what each is: its product count and when it was created", async () => {
        renderDialog([
            [bundle({ productsCount: 1 }), bundle({ id: "b", name: "", productsCount: 0, transactionsCount: 0 })],
        ]);
        await screen.findByText("Staff gifts");
        expect(screen.getByText(/^1 product/)).toBeTruthy();
        expect(screen.getByText(/^0 products/)).toBeTruthy();
        expect(screen.getByText("Unnamed order")).toBeTruthy();
        expect(screen.getAllByText(/^Created:/)).toHaveLength(2);
    });

    it("only says there are none when there really are none", async () => {
        renderDialog([[]]);
        expect(await screen.findByText(/you have no drafts yet/i)).toBeTruthy();
    });

    it("opens a draft and closes", async () => {
        const { onClose } = renderDialog([[bundle({ id: "draft-1" })]]);
        await screen.findByText("Staff gifts");
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(account.openDraft).toHaveBeenCalledWith("draft-1");
    });

    it("can't open the bundle which is already open", async () => {
        renderDialog([[bundle({ id: "current", name: "This one" })]]);
        await screen.findByText("This one");
        expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("loads the next page from where the last ended", async () => {
        const first = Array.from({ length: 10 }, (_, index) => bundle({ id: `a${index}`, name: `Order ${index}` }));
        const { getBundlesForCustomer } = renderDialog([first, [bundle({ id: "b0", name: "Order 10" })]]);
        await screen.findByText("Order 0");
        fireEvent.click(screen.getByRole("button", { name: "Load more" }));
        await screen.findByText("Order 10");
        expect(getBundlesForCustomer).toHaveBeenLastCalledWith({
            ordered: false,
            template: false,
            limit: 10,
            offset: 10,
        });
        expect(screen.getByText("Order 0")).toBeTruthy();
    });

    it("says something went wrong when the bundles can't be loaded", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const getBundlesForCustomer = vi.fn(async () => {
            throw new Error("offline");
        });
        render(
            <ClientProvider client={{ getBundlesForCustomer } as never}>
                <BundleProvider
                    bundle={{ getId: () => "current", getGlobalPropertyConfiguration: () => undefined } as never}
                    setBundle={() => {}}
                    startNewBundle={async () => {}}
                >
                    <AccountDialog initialPage="drafts" onClose={() => {}} onTemplateApplied={() => {}} />
                </BundleProvider>
            </ClientProvider>,
        );
        await screen.findByText(/couldn't load your bundles/i);
        expect(screen.queryByText(/you have no drafts yet/i)).toBeNull();
    });
});

describe("AccountDialog's sidebar", () => {
    it("closes when the customer clicks away from it, or presses Escape", async () => {
        const { onClose } = renderDialog([[bundle()]]);
        await screen.findByText("Staff gifts");
        fireEvent.mouseDown(screen.getByRole("dialog"));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe("AccountDialog's previous orders", () => {
    it("asks for the ordered ones, and lists them all", async () => {
        const { getBundlesForCustomer } = renderDialog(
            [[bundle({ id: "o1", name: "Order one", internalOrderId: "INT-7", transactionsCount: 0 })]],
            "orders",
        );
        await screen.findByText("INT-7-Order one");
        expect(getBundlesForCustomer).toHaveBeenCalledWith({ ordered: true, template: false, limit: 10, offset: 0 });
    });
});
