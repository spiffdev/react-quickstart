import type { Bundle } from "@spiffcommerce/core";
import {
    applyOrderDetails,
    dispatchRange,
    EMPTY_ORDER_DETAILS,
    missingOrderDetails,
    orderDetailFields,
    readOrderDetails,
    today,
    type OrderDetailField,
} from "./orderDetails";

/** The parts of a bundle the order details use, remembering what they were called with. */
const fakeBundle = (initial: { name?: string; purchaseOrder?: string; dispatchDate?: string } = {}) => {
    const state = { ...initial };
    const calls: string[] = [];
    const bundle = {
        getName: () => state.name,
        getPurchaseOrder: () => state.purchaseOrder,
        getDispatchDate: () => state.dispatchDate,
        setName: vi.fn(async (value: string) => {
            calls.push("name");
            state.name = value;
        }),
        setPurchaseOrder: vi.fn(async (value: string) => {
            calls.push("purchaseOrder");
            state.purchaseOrder = value;
        }),
        setDispatchDate: vi.fn(async (value: string) => {
            calls.push("dispatchDate");
            state.dispatchDate = value;
        }),
    };
    return { bundle: bundle as unknown as Bundle, mocks: bundle, calls };
};

const allFields: OrderDetailField[] = [
    { key: "name", label: "Order name", required: false },
    { key: "purchaseOrder", label: "Purchase order", required: true },
    { key: "dispatchDate", label: "Dispatch date", required: false },
];

describe("orderDetailFields", () => {
    it("asks for nothing when every detail is off or unset", () => {
        expect(orderDetailFields({ name: "off", purchaseOrder: undefined, dispatchDate: "off" })).toEqual([]);
    });

    it("lists the details which are switched on, in the order they're asked", () => {
        const fields = orderDetailFields({ name: "required", purchaseOrder: "off", dispatchDate: "optional" });
        expect(fields).toEqual([
            { key: "name", label: "Order name", required: true },
            { key: "dispatchDate", label: "Dispatch date", required: false },
        ]);
    });

    it("ignores values it doesn't know", () => {
        expect(
            orderDetailFields({ name: "sometimes" as never, purchaseOrder: "" as never, dispatchDate: undefined }),
        ).toEqual([]);
    });
});

describe("missingOrderDetails", () => {
    it("only reports required fields which are empty", () => {
        const missing = missingOrderDetails(allFields, EMPTY_ORDER_DETAILS);
        expect(missing.map((field) => field.key)).toEqual(["purchaseOrder"]);
    });

    it("treats whitespace as empty", () => {
        const missing = missingOrderDetails(allFields, { ...EMPTY_ORDER_DETAILS, purchaseOrder: "   " });
        expect(missing).toHaveLength(1);
    });

    it("reports nothing once the required fields are filled in", () => {
        expect(missingOrderDetails(allFields, { ...EMPTY_ORDER_DETAILS, purchaseOrder: "PO-1" })).toEqual([]);
    });
});

describe("dates", () => {
    afterEach(() => vi.useRealTimers());

    it("gives today in the customer's own time zone", () => {
        vi.useFakeTimers();
        // Local time, so the day is the same whatever the test machine's time zone.
        vi.setSystemTime(new Date(2026, 10, 20, 23, 30));
        expect(today()).toBe("2026-11-20");
        vi.setSystemTime(new Date(2026, 0, 5, 0, 5));
        expect(today()).toBe("2026-01-05");
    });

    describe("dispatchRange", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 10, 20, 12, 0));
        });

        it("starts today when the collection has no dates", () => {
            expect(dispatchRange()).toEqual({ min: "2026-11-20", max: undefined });
        });

        it("never allows the past, even when the collection's window began earlier", () => {
            expect(dispatchRange({ dispatchStartDate: "2026-10-01T00:00:00Z" }).min).toBe("2026-11-20");
        });

        it("starts at the collection's start when that's still ahead", () => {
            const range = dispatchRange({
                dispatchStartDate: "2026-12-01T00:00:00Z",
                dispatchEndDate: "2026-12-24T00:00:00Z",
            });
            expect(range).toEqual({ min: "2026-12-01", max: "2026-12-24" });
        });
    });
});

describe("readOrderDetails", () => {
    it("is empty for a bundle with nothing set", () => {
        expect(readOrderDetails(fakeBundle().bundle)).toEqual(EMPTY_ORDER_DETAILS);
    });

    it("trims the name and purchase order", () => {
        const { bundle } = fakeBundle({ name: "  Staff gifts ", purchaseOrder: " PO-7 " });
        expect(readOrderDetails(bundle)).toMatchObject({ name: "Staff gifts", purchaseOrder: "PO-7" });
    });

    it("reads the dispatch date as a local day", () => {
        const { bundle } = fakeBundle({ dispatchDate: new Date(2026, 10, 20, 15, 45).toISOString() });
        expect(readOrderDetails(bundle).dispatchDate).toBe("2026-11-20");
    });
});

describe("applyOrderDetails", () => {
    it("sets each field on the bundle's own properties", async () => {
        const { bundle, mocks } = fakeBundle();
        await applyOrderDetails(bundle, allFields, {
            name: " Staff gifts ",
            purchaseOrder: "PO-1",
            dispatchDate: "2026-11-20",
        });
        expect(mocks.setName).toHaveBeenCalledWith("Staff gifts");
        expect(mocks.setPurchaseOrder).toHaveBeenCalledWith("PO-1");
        expect(mocks.setDispatchDate).toHaveBeenCalledTimes(1);
    });

    it("sends the dispatch date as the chosen local day at the current local time", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 18, 14, 25));
        try {
            const { bundle, mocks } = fakeBundle();
            await applyOrderDetails(bundle, allFields, { ...EMPTY_ORDER_DETAILS, dispatchDate: "2026-11-20" });
            const sent = new Date(mocks.setDispatchDate.mock.calls[0][0]);
            expect([sent.getFullYear(), sent.getMonth(), sent.getDate(), sent.getHours(), sent.getMinutes()]).toEqual([
                2026, 10, 20, 14, 25,
            ]);
        } finally {
            vi.useRealTimers();
        }
    });

    it("only sends what has changed, as each is a request to the server", async () => {
        const { bundle, mocks } = fakeBundle({ name: "Staff gifts", purchaseOrder: "PO-1" });
        await applyOrderDetails(bundle, allFields, {
            ...EMPTY_ORDER_DETAILS,
            name: "Staff gifts",
            purchaseOrder: "PO-2",
        });
        expect(mocks.setName).not.toHaveBeenCalled();
        expect(mocks.setPurchaseOrder).toHaveBeenCalledWith("PO-2");
        expect(mocks.setDispatchDate).not.toHaveBeenCalled();
    });

    it("doesn't resend an unchanged dispatch date, whatever time of day it was saved with", async () => {
        const saved = new Date(2026, 10, 20, 9, 5).toISOString();
        const { bundle, mocks } = fakeBundle({ dispatchDate: saved });
        await applyOrderDetails(bundle, allFields, { ...EMPTY_ORDER_DETAILS, dispatchDate: "2026-11-20" });
        expect(mocks.setDispatchDate).not.toHaveBeenCalled();
    });

    it("leaves alone the fields the partner hasn't switched on", async () => {
        const { bundle, mocks } = fakeBundle();
        const onlyName = allFields.filter((field) => field.key === "name");
        await applyOrderDetails(bundle, onlyName, {
            name: "Staff gifts",
            purchaseOrder: "PO-1",
            dispatchDate: "2026-11-20",
        });
        expect(mocks.setName).toHaveBeenCalledTimes(1);
        expect(mocks.setPurchaseOrder).not.toHaveBeenCalled();
        expect(mocks.setDispatchDate).not.toHaveBeenCalled();
    });

    it("can clear a field the customer has emptied", async () => {
        const { bundle, mocks } = fakeBundle({ purchaseOrder: "PO-1" });
        await applyOrderDetails(bundle, allFields, EMPTY_ORDER_DETAILS);
        expect(mocks.setPurchaseOrder).toHaveBeenCalledWith("");
    });

    it("stops at the first failure so it can simply be tried again", async () => {
        const { bundle, mocks, calls } = fakeBundle();
        mocks.setName.mockRejectedValueOnce(new Error("offline"));
        await expect(
            applyOrderDetails(bundle, allFields, { name: "A", purchaseOrder: "PO-1", dispatchDate: "" }),
        ).rejects.toThrow("offline");
        expect(calls).toEqual([]);
    });
});
