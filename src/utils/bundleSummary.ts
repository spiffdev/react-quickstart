import type { BundleRaw } from "@spiffcommerce/core";

// Only what is shown, and any of it may be missing.
type Summarised = Partial<
    Pick<
        BundleRaw,
        | "name"
        | "externalOrderId"
        | "internalOrderId"
        | "quoteId"
        | "productCollection"
        | "productsCount"
        | "transactionsCount"
        | "createdAt"
        | "totalPriceSubunits"
    >
>;

/** What an order or draft is called in a list: its order or quote number, then its name (or collection's name). */
export const bundleTitle = (bundle: Summarised) => {
    const reference = bundle.externalOrderId || bundle.internalOrderId || bundle.quoteId;
    return `${reference ? `${reference}-` : ""}${bundle.name || bundle.productCollection?.name || "Unnamed order"}`;
};

/**
 * How many products are in it. A product is counted once however many designs it has, so this isn't the number of
 * designs (or recipients), which is what the server calls a transaction.
 */
export const productCountLabel = (bundle: Summarised) => {
    const count = bundle.productsCount || bundle.transactionsCount || 0;
    return `${count} ${count === 1 ? "product" : "products"}`;
};

/** When it was started, or "Unknown". */
export const createdLabel = (bundle: Summarised) =>
    bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString() : "Unknown";

/** Its total, when there is one and a presentment currency to show it in. */
export const priceLabel = (bundle: Summarised, format: ((subunits: number) => string) | undefined) =>
    format && bundle.totalPriceSubunits ? format(bundle.totalPriceSubunits) : undefined;
