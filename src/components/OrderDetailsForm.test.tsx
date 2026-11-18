import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OrderDetailsForm from "./OrderDetailsForm";
import { EMPTY_ORDER_DETAILS, type OrderDetailField } from "../utils/orderDetails";

const fields: OrderDetailField[] = [
    { key: "name", label: "Order name", required: false },
    { key: "purchaseOrder", label: "Purchase order", required: true },
    { key: "dispatchDate", label: "Dispatch date", required: false },
];

const renderForm = (props: Partial<React.ComponentProps<typeof OrderDetailsForm>> = {}) => {
    const onSubmit = vi.fn(async () => {});
    render(
        <OrderDetailsForm
            fields={fields}
            initialValues={EMPTY_ORDER_DETAILS}
            submitLabel="Save"
            submittingLabel="Saving..."
            onSubmit={onSubmit}
            {...props}
        />,
    );
    return { onSubmit, submit: () => screen.getByRole("button", { name: /save|saving/i }) as HTMLButtonElement };
};

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("OrderDetailsForm", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 20, 12, 0));
    });
    afterEach(() => vi.useRealTimers());

    it("asks only for the fields it's given, marking the required ones", () => {
        renderForm({ fields: fields.slice(1) });
        expect(screen.queryByLabelText(/order name/i)).toBeNull();
        expect(screen.getByLabelText(/purchase order \*/i)).toBeTruthy();
        expect(screen.getByLabelText(/dispatch date/i)).toBeTruthy();
    });

    it("can't be submitted until the required fields are filled in", () => {
        const { submit } = renderForm();
        expect(submit().disabled).toBe(true);
        type(/purchase order/i, "   ");
        expect(submit().disabled).toBe(true);
        type(/purchase order/i, "PO-1");
        expect(submit().disabled).toBe(false);
    });

    it("can be submitted straight away when nothing is required", () => {
        const { submit } = renderForm({ fields: [fields[0], fields[2]] });
        expect(submit().disabled).toBe(false);
    });

    it("hands over what was entered", async () => {
        const { onSubmit, submit } = renderForm();
        type(/order name/i, "Staff gifts");
        type(/purchase order/i, "PO-1");
        type(/dispatch date/i, "2026-12-01");
        fireEvent.click(submit());
        await waitFor(() =>
            expect(onSubmit).toHaveBeenCalledWith({
                name: "Staff gifts",
                purchaseOrder: "PO-1",
                dispatchDate: "2026-12-01",
            }),
        );
    });

    it("starts with what the order already has", () => {
        renderForm({ initialValues: { name: "Staff gifts", purchaseOrder: "PO-9", dispatchDate: "2026-12-01" } });
        expect((screen.getByLabelText(/order name/i) as HTMLInputElement).value).toBe("Staff gifts");
        expect((screen.getByLabelText(/purchase order/i) as HTMLInputElement).value).toBe("PO-9");
    });

    it("limits the dispatch date to today onwards, and the collection's window", () => {
        renderForm({
            collection: { dispatchStartDate: "2026-12-01T00:00:00Z", dispatchEndDate: "2026-12-24T00:00:00Z" },
        });
        const date = screen.getByLabelText(/dispatch date/i) as HTMLInputElement;
        expect(date.type).toBe("date");
        expect(date.min).toBe("2026-12-01");
        expect(date.max).toBe("2026-12-24");
    });

    it("won't submit a dispatch date outside the window", () => {
        const { submit } = renderForm({
            fields: [fields[2]],
            collection: { dispatchStartDate: "2026-12-01T00:00:00Z", dispatchEndDate: "2026-12-24T00:00:00Z" },
        });
        type(/dispatch date/i, "2027-01-10");
        expect(submit().disabled).toBe(true);
        expect(screen.getByText(/between 2026-12-01 and 2026-12-24/)).toBeTruthy();
        type(/dispatch date/i, "2026-12-10");
        expect(submit().disabled).toBe(false);
    });

    it("shows why it failed and lets the customer try again", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const onSubmit = vi.fn().mockRejectedValueOnce(new Error("The server is down.")).mockResolvedValue(undefined);
        const { submit } = renderForm({ fields: [fields[0]], onSubmit });
        fireEvent.click(submit());
        await screen.findByText("The server is down.");
        expect(submit().disabled).toBe(false);
        fireEvent.click(submit());
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    });
});
