import { FunctionComponent, useState } from "react";
import type { Customer } from "@spiffcommerce/core";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import { Input, Muted } from "./dialogParts";
import type { CustomerDetails } from "../hooks/useAccount";

const FIELDS = [
    { key: "firstName", label: "First name", autoComplete: "given-name", type: "text" },
    { key: "lastName", label: "Last name", autoComplete: "family-name", type: "text" },
    { key: "phoneNumber", label: "Phone number", autoComplete: "tel", type: "tel" },
] as const;

/**
 * The signed in customer's own details. Their email address is how they sign in, so it's shown but can't be changed.
 */
const CustomerDetailsForm: FunctionComponent<{
    customer: Customer;
    onSave: (details: CustomerDetails) => Promise<void>;
}> = ({ customer, onSave }) => {
    const [details, setDetails] = useState<CustomerDetails>({
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        phoneNumber: customer.phoneNumber ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const change = (key: keyof CustomerDetails, value: string) => {
        setSaved(false);
        setDetails((previous) => ({ ...previous, [key]: value }));
    };

    const submit = async () => {
        setSaving(true);
        setSaved(false);
        setError(undefined);
        try {
            await onSave(details);
            setSaved(true);
        } catch (caught) {
            console.error("Error saving the customer's details:", caught);
            setError("We couldn't save your details. Please try again.");
        } finally {
            setSaving(false);
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
            <Muted>Your email address is how you sign in, so it can't be changed here.</Muted>
            <Input aria-label="Email address" type="email" value={customer.emailAddress} disabled readOnly />
            {FIELDS.map((field) => (
                <Input
                    key={field.key}
                    aria-label={field.label}
                    placeholder={field.label}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    value={details[field.key]}
                    disabled={saving}
                    onChange={(event) => change(field.key, event.target.value)}
                />
            ))}
            <Button type="submit" fullWidth disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
            </Button>
        </form>
    );
};

export default CustomerDetailsForm;
