import { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import { Input } from "./dialogParts";
import { dispatchRange, missingOrderDetails, type OrderDetailField, type OrderDetails } from "../utils/orderDetails";

const Label = styled.label`
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
`;

/**
 * Asks for the order details the partner has switched on. Required ones must be filled in before it can be submitted.
 */
const OrderDetailsForm: FunctionComponent<{
    fields: OrderDetailField[];
    initialValues: OrderDetails;
    /** The product collection's dispatch dates, which limit the dates which can be chosen. */
    collection?: { dispatchStartDate?: string; dispatchEndDate?: string };
    submitLabel: string;
    submittingLabel: string;
    onSubmit: (details: OrderDetails) => Promise<void>;
}> = ({ fields, initialValues, collection, submitLabel, submittingLabel, onSubmit }) => {
    const [details, setDetails] = useState(initialValues);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const range = dispatchRange(collection);
    const missing = missingOrderDetails(fields, details);
    const outOfRange =
        !!details.dispatchDate &&
        (details.dispatchDate < range.min || (!!range.max && details.dispatchDate > range.max));

    const submit = async () => {
        setSubmitting(true);
        setError(undefined);
        try {
            await onSubmit(details);
        } catch (caught) {
            console.error("Error saving the order details:", caught);
            setError(
                caught instanceof Error && caught.message ? caught.message : "We couldn't save that. Please try again.",
            );
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
            {fields.map((field) => (
                <div key={field.key}>
                    <Label htmlFor={`order-detail-${field.key}`}>
                        {field.label}
                        {field.required ? " *" : ""}
                    </Label>
                    <Input
                        id={`order-detail-${field.key}`}
                        type={field.key === "dispatchDate" ? "date" : "text"}
                        min={field.key === "dispatchDate" ? range.min : undefined}
                        max={field.key === "dispatchDate" ? range.max : undefined}
                        value={details[field.key]}
                        disabled={submitting}
                        onChange={(event) =>
                            setDetails((previous) => ({ ...previous, [field.key]: event.target.value }))
                        }
                    />
                </div>
            ))}
            {outOfRange && (
                <ErrorBanner
                    message={`Please choose a dispatch date${range.max ? ` between ${range.min} and ${range.max}` : ` from ${range.min}`}.`}
                    onDismiss={() => setDetails((previous) => ({ ...previous, dispatchDate: "" }))}
                />
            )}
            <Button type="submit" fullWidth disabled={submitting || missing.length > 0 || outOfRange}>
                {submitting ? submittingLabel : submitLabel}
            </Button>
        </form>
    );
};

export default OrderDetailsForm;
