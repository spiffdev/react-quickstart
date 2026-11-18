import type { Bundle } from "@spiffcommerce/core";
import type { OrderDetailMode } from "../configurationSchema";

export type OrderDetailKey = "name" | "purchaseOrder" | "dispatchDate";

/** What the customer enters about an order. The dispatch date is a day, as `YYYY-MM-DD`. */
export type OrderDetails = Record<OrderDetailKey, string>;

export interface OrderDetailField {
    key: OrderDetailKey;
    label: string;
    required: boolean;
}

export const EMPTY_ORDER_DETAILS: OrderDetails = { name: "", purchaseOrder: "", dispatchDate: "" };

const LABELS: Record<OrderDetailKey, string> = {
    name: "Order name",
    purchaseOrder: "Purchase order",
    dispatchDate: "Dispatch date",
};

/** The details the partner has switched on, in the order they're asked. */
export const orderDetailFields = (modes: Record<OrderDetailKey, OrderDetailMode | undefined>): OrderDetailField[] =>
    (["name", "purchaseOrder", "dispatchDate"] as const).flatMap((key) =>
        modes[key] === "optional" || modes[key] === "required"
            ? [{ key, label: LABELS[key], required: modes[key] === "required" }]
            : [],
    );

/** A date as `YYYY-MM-DD`, in the customer's own time zone. */
const localDay = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** What the bundle already has. */
export const readOrderDetails = (bundle: Bundle): OrderDetails => ({
    name: bundle.getName()?.trim() ?? "",
    purchaseOrder: bundle.getPurchaseOrder()?.trim() ?? "",
    // Read in local time, as it was chosen.
    dispatchDate: bundle.getDispatchDate() ? localDay(new Date(bundle.getDispatchDate()!)) : "",
});

/** The required fields which have nothing in them. */
export const missingOrderDetails = (fields: OrderDetailField[], details: OrderDetails) =>
    fields.filter((field) => field.required && !details[field.key].trim());

/** Today as `YYYY-MM-DD`, in the customer's own time zone. */
export const today = () => localDay(new Date());

/** The days a dispatch date can be chosen from: not in the past, and within the collection's dates when it has them. */
export const dispatchRange = (collection?: { dispatchStartDate?: string; dispatchEndDate?: string }) => {
    const start = collection?.dispatchStartDate?.slice(0, 10);
    const min = start && start > today() ? start : today();
    return { min, max: collection?.dispatchEndDate?.slice(0, 10) };
};

/**
 * Records the details on the bundle. Only the fields the partner has switched on are touched, and each is only sent
 * when it has changed, as every one is a request to the server.
 */
export const applyOrderDetails = async (bundle: Bundle, fields: OrderDetailField[], details: OrderDetails) => {
    const current = readOrderDetails(bundle);
    for (const { key } of fields) {
        const value = details[key].trim();
        if (value === current[key]) continue;
        if (key === "name") await bundle.setName(value);
        else if (key === "purchaseOrder") await bundle.setPurchaseOrder(value);
        // As the corporate theme does: the chosen day at the current local time, sent as an instant.
        else {
            const [year, month, day] = value.split("-").map(Number);
            const now = new Date();
            await bundle.setDispatchDate(
                new Date(year, month - 1, day, now.getHours(), now.getMinutes()).toISOString(),
            );
        }
    }
};
