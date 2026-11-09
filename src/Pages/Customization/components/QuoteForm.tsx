import { FunctionComponent, useMemo, useState } from "react";
import styled from "styled-components";
import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import Button from "../../../components/button";
import Typography from "../../../components/typography";
import useThemeConfiguration from "../../../hooks/useThemeConfiguration";

/**
 * The details a customer has entered, keyed by the field's unique identifier (or its type when it has none).
 */
export type QuoteDetails = Record<string, string>;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
`;

const Input = styled.input`
    padding: 10px;
    font-size: 14px;
    border: 1px solid #bdbdbd;
    border-radius: 5px;
`;

const ErrorText = styled(Typography)`
    margin: 0;
    font-size: 13px;
    color: #d32f2f;
`;

const FIELD_TITLES: Partial<Record<ConversionDataType, string>> = {
    [ConversionDataType.FirstName]: "First name",
    [ConversionDataType.LastName]: "Last name",
    [ConversionDataType.Email]: "Email",
    [ConversionDataType.Phone]: "Phone",
    [ConversionDataType.OrganizationName]: "Company",
    [ConversionDataType.StreetAddress]: "Street address",
    [ConversionDataType.Apartment]: "Apartment",
    [ConversionDataType.City]: "City",
    [ConversionDataType.State]: "State",
    [ConversionDataType.Country]: "Country",
    [ConversionDataType.PostCode]: "Post code",
};

export const fieldId = (field: ConversionData) => field.uniqueIdentifier ?? field.type;

/**
 * Asks for the details configured in the conversion configuration, or just an email when none is configured.
 */
const QuoteForm: FunctionComponent<{
    submitting: boolean;
    onSubmit: (details: QuoteDetails) => void;
    submitLabel?: string;
    submittingLabel?: string;
}> = ({ submitting, onSubmit, submitLabel = "Request a Quote", submittingLabel = "Requesting quote..." }) => {
    const { conversionConfiguration } = useThemeConfiguration();
    const fields = useMemo<ConversionData[]>(
        () => conversionConfiguration?.requestedDataItems ?? [{ type: ConversionDataType.Email, mandatory: true }],
        [conversionConfiguration],
    );
    const [values, setValues] = useState<QuoteDetails>({});

    const missing = fields.filter((field) => field.mandatory && !values[fieldId(field)]?.trim());

    return (
        <Form
            onSubmit={(event) => {
                event.preventDefault();
                if (missing.length === 0) onSubmit(values);
            }}
        >
            {fields.map((field) => (
                <Field key={fieldId(field)}>
                    {field.title || FIELD_TITLES[field.type] || field.type}
                    {field.mandatory ? " *" : ""}
                    <Input
                        type={field.type === ConversionDataType.Email ? "email" : "text"}
                        value={values[fieldId(field)] ?? ""}
                        onChange={(event) => setValues({ ...values, [fieldId(field)]: event.target.value })}
                    />
                </Field>
            ))}
            {missing.length > 0 && Object.keys(values).length > 0 && (
                <ErrorText variant="p">Please fill in the required fields.</ErrorText>
            )}
            <Button type="submit" fullWidth disabled={submitting || missing.length > 0}>
                {submitting ? submittingLabel : submitLabel}
            </Button>
        </Form>
    );
};

export default QuoteForm;
