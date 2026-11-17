import { bundleTitle, createdLabel, priceLabel, productCountLabel } from "./bundleSummary";

describe("bundleTitle", () => {
    it("is the name when there's no order or quote number", () => {
        expect(bundleTitle({ name: "Staff gifts" })).toBe("Staff gifts");
    });

    it("leads with the order number, preferring the external one", () => {
        expect(
            bundleTitle({ name: "Staff gifts", externalOrderId: "EXT-1", internalOrderId: "INT-1", quoteId: "Q-1" }),
        ).toBe("EXT-1-Staff gifts");
        expect(bundleTitle({ name: "Staff gifts", internalOrderId: "INT-1", quoteId: "Q-1" })).toBe(
            "INT-1-Staff gifts",
        );
    });

    it("leads with the quote number when that's all there is", () => {
        expect(bundleTitle({ name: "Staff gifts", quoteId: "Q-1" })).toBe("Q-1-Staff gifts");
    });

    it("falls back to the collection's name, as bundles may have blank names", () => {
        expect(bundleTitle({ name: "", productCollection: { name: "Uniforms" } as never })).toBe("Uniforms");
        expect(
            bundleTitle({
                name: undefined,
                internalOrderId: "INT-1",
                productCollection: { name: "Uniforms" } as never,
            }),
        ).toBe("INT-1-Uniforms");
    });

    it("never shows nothing", () => {
        expect(bundleTitle({})).toBe("Unnamed order");
    });
});

describe("productCountLabel", () => {
    it("counts products, not designs", () => {
        expect(productCountLabel({ productsCount: 2, transactionsCount: 40 })).toBe("2 products");
    });

    it("says product in the singular", () => {
        expect(productCountLabel({ productsCount: 1, transactionsCount: 5 })).toBe("1 product");
    });

    it("uses the number of designs when the server hasn't counted products", () => {
        expect(productCountLabel({ transactionsCount: 3 })).toBe("3 products");
        expect(productCountLabel({ productsCount: 0, transactionsCount: 3 })).toBe("3 products");
    });

    it("is zero when nothing is counted", () => {
        expect(productCountLabel({})).toBe("0 products");
    });
});

describe("createdLabel", () => {
    it("is the date it was started", () => {
        const created = new Date(2026, 10, 20, 15, 0);
        expect(createdLabel({ createdAt: created.toISOString() })).toBe(created.toLocaleDateString());
    });

    it("is Unknown without one", () => {
        expect(createdLabel({})).toBe("Unknown");
    });
});

describe("priceLabel", () => {
    const format = (subunits: number) => `$${(subunits / 100).toFixed(2)}`;

    it("formats the total", () => {
        expect(priceLabel({ totalPriceSubunits: 12345 }, format)).toBe("$123.45");
    });

    it("is nothing without a total, or without a currency to show it in", () => {
        expect(priceLabel({}, format)).toBeUndefined();
        expect(priceLabel({ totalPriceSubunits: 0 }, format)).toBeUndefined();
        expect(priceLabel({ totalPriceSubunits: 12345 }, undefined)).toBeUndefined();
    });
});
