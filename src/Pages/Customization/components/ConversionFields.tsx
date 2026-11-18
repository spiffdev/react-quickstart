import { FunctionComponent } from "react";
import styled from "styled-components";
import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import { fieldId, type QuoteDetails } from "../../../utils/conversionDetails";

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

    &:disabled {
        color: #616161;
        background-color: #f5f5f5;
    }
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

/**
 * The fields of a conversion configuration, as a controlled set of inputs. A field can be locked, which shows its value
 * without letting it be changed, such as the email address of a customer who is signed in.
 */
const ConversionFields: FunctionComponent<{
    fields: ConversionData[];
    values: QuoteDetails;
    onChange: (id: string, value: string) => void;
    /** The identifiers of the fields which can't be changed. */
    lockedIds?: string[];
    disabled?: boolean;
}> = ({ fields, values, onChange, lockedIds = [], disabled = false }) => (
    <>
        {fields.map((field) => {
            const id = fieldId(field);
            const locked = lockedIds.includes(id);
            return (
                <Field key={id}>
                    {field.title || FIELD_TITLES[field.type] || field.type}
                    {field.mandatory ? " *" : ""}
                    <Input
                        type={field.type === ConversionDataType.Email ? "email" : "text"}
                        value={values[id] ?? ""}
                        disabled={disabled || locked}
                        readOnly={locked}
                        onChange={(event) => onChange(id, event.target.value)}
                    />
                </Field>
            );
        })}
    </>
);

export default ConversionFields;
