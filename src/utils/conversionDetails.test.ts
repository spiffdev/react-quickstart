import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import { fieldId, missingConversionFields, prefillConversionDetails } from "./conversionDetails";

const email: ConversionData = { type: ConversionDataType.Email, mandatory: true };
const first: ConversionData = { type: ConversionDataType.FirstName, mandatory: true };
const last: ConversionData = { type: ConversionDataType.LastName, mandatory: false };
const phone: ConversionData = { type: ConversionDataType.Phone, uniqueIdentifier: "mobile", mandatory: false };
const company: ConversionData = { type: ConversionDataType.OrganizationName, mandatory: true };

const person = { emailAddress: "jo@example.com", firstName: "Jo", lastName: "Smith", phoneNumber: "0400 000 000" };

describe("fieldId", () => {
    it("is the unique identifier, falling back to the type", () => {
        expect(fieldId(phone)).toBe("mobile");
        expect(fieldId(email)).toBe(ConversionDataType.Email);
    });
});

describe("prefillConversionDetails", () => {
    it("fills in what's known of the customer", () => {
        expect(prefillConversionDetails([email, first, last, phone], new Map(), person)).toEqual({
            [ConversionDataType.Email]: "jo@example.com",
            [ConversionDataType.FirstName]: "Jo",
            [ConversionDataType.LastName]: "Smith",
            mobile: "0400 000 000",
        });
    });

    it("leaves fields the customer has nothing for empty, such as a company", () => {
        expect(prefillConversionDetails([email, company], new Map(), person)).toEqual({
            [ConversionDataType.Email]: "jo@example.com",
        });
    });

    it("is empty with nobody to go on", () => {
        expect(prefillConversionDetails([email, first], new Map())).toEqual({});
        expect(prefillConversionDetails([email, first], new Map(), {})).toEqual({});
    });

    it("prefers what the customer has already given for this order", () => {
        const metadata = new Map([
            [ConversionDataType.FirstName, "Joanne"],
            ["mobile", "0411 111 111"],
            [ConversionDataType.OrganizationName, "Acme"],
        ]);
        expect(prefillConversionDetails([email, first, phone, company], metadata, person)).toEqual({
            [ConversionDataType.Email]: "jo@example.com",
            [ConversionDataType.FirstName]: "Joanne",
            mobile: "0411 111 111",
            [ConversionDataType.OrganizationName]: "Acme",
        });
    });

    it("falls back to the customer when what was saved is blank", () => {
        const metadata = new Map([[ConversionDataType.FirstName, ""]]);
        expect(prefillConversionDetails([first], metadata, person)).toEqual({ [ConversionDataType.FirstName]: "Jo" });
    });

    it("only fills in the fields which are asked for", () => {
        expect(prefillConversionDetails([last], new Map(), person)).toEqual({ [ConversionDataType.LastName]: "Smith" });
    });
});

describe("missingConversionFields", () => {
    it("lists the mandatory fields with nothing in them", () => {
        expect(
            missingConversionFields([email, first, last, company], { [ConversionDataType.Email]: "jo@example.com" }),
        ).toEqual([first, company]);
    });

    it("counts whitespace as nothing", () => {
        expect(missingConversionFields([first], { [ConversionDataType.FirstName]: "   " })).toEqual([first]);
    });

    it("is empty when everything required is given, or nothing is required", () => {
        expect(
            missingConversionFields([email, first], {
                [ConversionDataType.Email]: "a@b.co",
                [ConversionDataType.FirstName]: "Jo",
            }),
        ).toEqual([]);
        expect(missingConversionFields([last, phone], {})).toEqual([]);
    });

    it("finds a field by its unique identifier", () => {
        const mandatoryPhone = { ...phone, mandatory: true };
        expect(missingConversionFields([mandatoryPhone], { [ConversionDataType.Phone]: "0400" })).toEqual([
            mandatoryPhone,
        ]);
        expect(missingConversionFields([mandatoryPhone], { mobile: "0400" })).toEqual([]);
    });
});
