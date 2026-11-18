import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import ReviewPage from ".";

vi.mock("../Customization/previewScreenshot", () => ({
    createDesignPreviewImage: vi.fn(),
    withScreenshotPreview: vi.fn(),
}));

const fields: ConversionData[] = [
    { type: ConversionDataType.Email, mandatory: true },
    { type: ConversionDataType.FirstName, mandatory: false },
];

const renderReview = (props: Partial<React.ComponentProps<typeof ReviewPage>> = {}) => {
    const onConfirm = vi.fn(async () => {});
    const onRequestQuote = vi.fn();
    render(<ReviewPage experiences={[]} onConfirm={onConfirm} allowQuote onRequestQuote={onRequestQuote} {...props} />);
    const cart = () => screen.getByRole("button", { name: /complete design/i }) as HTMLButtonElement;
    const quote = () => screen.getByRole("button", { name: /request a quote/i }) as HTMLButtonElement;
    return { onConfirm, onRequestQuote, cart, quote };
};

const conversion = (overrides: Partial<NonNullable<React.ComponentProps<typeof ReviewPage>["conversion"]>> = {}) => ({
    fields,
    values: {},
    onChange: vi.fn(),
    lockedIds: [],
    cartBlocked: false,
    quoteBlocked: false,
    ...overrides,
});

describe("ReviewPage's details", () => {
    it("has no details section when the conversion configuration isn't in play", async () => {
        const { cart } = renderReview();
        await waitFor(() => expect(cart().disabled).toBe(false));
        expect(screen.queryByText("Your details")).toBeNull();
    });

    it("shows the details inline, starting with what it's given", async () => {
        const { cart } = renderReview({
            conversion: conversion({ values: { [ConversionDataType.Email]: "jo@example.com" } }),
        });
        await waitFor(() => expect(cart().disabled).toBe(false));
        expect(screen.getByRole("heading", { name: "Your details" })).toBeTruthy();
        expect((screen.getByLabelText("Email *") as HTMLInputElement).value).toBe("jo@example.com");
    });

    it("reports what the customer types", async () => {
        const details = conversion();
        const { cart } = renderReview({ conversion: details });
        await waitFor(() => expect(cart().disabled).toBe(false));
        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Jo" } });
        expect(details.onChange).toHaveBeenCalledWith(ConversionDataType.FirstName, "Jo");
    });

    it("stops the design being completed while required details are missing, when they're mandatory", async () => {
        const { cart, quote } = renderReview({ conversion: conversion({ cartBlocked: true, quoteBlocked: true }) });
        await waitFor(() => expect(screen.getByRole("heading", { name: "Your details" })).toBeTruthy());
        expect(cart().disabled).toBe(true);
        expect(quote().disabled).toBe(true);
    });

    it("lets a design be completed without optional details, but not a quote", async () => {
        const { cart, quote } = renderReview({ conversion: conversion({ cartBlocked: false, quoteBlocked: true }) });
        await waitFor(() => expect(cart().disabled).toBe(false));
        expect(quote().disabled).toBe(true);
    });

    it("lets both go ahead once the details are in", async () => {
        const { cart, quote, onConfirm } = renderReview({ conversion: conversion() });
        await waitFor(() => expect(cart().disabled).toBe(false));
        expect(quote().disabled).toBe(false);
        fireEvent.click(cart());
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    });

    it("keeps the details from being changed while the order is being completed", async () => {
        let finish: () => void = () => {};
        const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
        const { cart } = renderReview({ conversion: conversion(), onConfirm });
        await waitFor(() => expect(cart().disabled).toBe(false));
        fireEvent.click(cart());
        await waitFor(() => expect((screen.getByLabelText("First name") as HTMLInputElement).disabled).toBe(true));
        finish();
    });
});
