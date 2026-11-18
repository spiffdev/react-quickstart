import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";

/**
 * The details a customer has entered, keyed by the field's unique identifier (or its type when it has none).
 */
export type QuoteDetails = Record<string, string>;

/** The identifier a field's value is stored under. */
export const fieldId = (field: ConversionData) => field.uniqueIdentifier ?? field.type;

/** Someone whose details can be filled in for them: a signed in customer, or the owner of a bundle. */
export interface Person {
    emailAddress?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
}

/**
 * What the form starts with. A value already saved on the bundle comes first, as the customer has given it for this
 * order, then what's known of the person (their email address, name and phone number). Anything else starts empty.
 */
export const prefillConversionDetails = (
    fields: ConversionData[],
    metadata: ReadonlyMap<string, string>,
    person?: Person,
): QuoteDetails => {
    const fromPerson: Partial<Record<ConversionDataType, string | undefined>> = {
        [ConversionDataType.Email]: person?.emailAddress,
        [ConversionDataType.FirstName]: person?.firstName,
        [ConversionDataType.LastName]: person?.lastName,
        [ConversionDataType.Phone]: person?.phoneNumber,
    };
    const values: QuoteDetails = {};
    for (const field of fields) {
        const id = fieldId(field);
        const value = metadata.get(id) || fromPerson[field.type];
        if (value) values[id] = value;
    }
    return values;
};

/** The mandatory fields which have nothing in them. */
export const missingConversionFields = (fields: ConversionData[], details: QuoteDetails) =>
    fields.filter((field) => field.mandatory && !details[fieldId(field)]?.trim());
