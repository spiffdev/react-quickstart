import { fireEvent, render, screen } from "@testing-library/react";
import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import ConversionFields from "./ConversionFields";

const fields: ConversionData[] = [
    { type: ConversionDataType.Email, mandatory: true },
    { type: ConversionDataType.FirstName, mandatory: false },
    { type: ConversionDataType.Phone, uniqueIdentifier: "mobile", title: "Mobile number", mandatory: false },
];

const renderFields = (props: Partial<React.ComponentProps<typeof ConversionFields>> = {}) => {
    const onChange = vi.fn();
    render(<ConversionFields fields={fields} values={{}} onChange={onChange} {...props} />);
    return { onChange };
};

describe("ConversionFields", () => {
    it("labels each field, marking the mandatory ones, and uses the configured title", () => {
        renderFields();
        expect(screen.getByLabelText("Email *")).toBeTruthy();
        expect(screen.getByLabelText("First name")).toBeTruthy();
        expect(screen.getByLabelText("Mobile number")).toBeTruthy();
    });

    it("shows the values it's given, by each field's identifier", () => {
        renderFields({ values: { [ConversionDataType.Email]: "jo@example.com", mobile: "0400 000 000" } });
        expect((screen.getByLabelText("Email *") as HTMLInputElement).value).toBe("jo@example.com");
        expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("0400 000 000");
        expect((screen.getByLabelText("First name") as HTMLInputElement).value).toBe("");
    });

    it("reports a change with the field's identifier", () => {
        const { onChange } = renderFields();
        fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "0400" } });
        expect(onChange).toHaveBeenCalledWith("mobile", "0400");
        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Jo" } });
        expect(onChange).toHaveBeenCalledWith(ConversionDataType.FirstName, "Jo");
    });

    it("shows a locked field without letting it be changed", () => {
        renderFields({
            values: { [ConversionDataType.Email]: "jo@example.com" },
            lockedIds: [ConversionDataType.Email],
        });
        const locked = screen.getByLabelText("Email *") as HTMLInputElement;
        expect(locked.value).toBe("jo@example.com");
        expect(locked.disabled).toBe(true);
        expect(locked.readOnly).toBe(true);
        expect((screen.getByLabelText("First name") as HTMLInputElement).disabled).toBe(false);
    });

    it("can all be disabled", () => {
        renderFields({ disabled: true });
        for (const input of screen.getAllByRole("textbox")) expect((input as HTMLInputElement).disabled).toBe(true);
    });
});
