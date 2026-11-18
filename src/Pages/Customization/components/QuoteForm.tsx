import { FunctionComponent, useMemo, useState } from "react";
import styled from "styled-components";
import { ConversionDataType, type ConversionData } from "@spiffcommerce/theme-bridge";
import { fieldId, missingConversionFields, type QuoteDetails } from "../../../utils/conversionDetails";
import ConversionFields from "./ConversionFields";
import Button from "../../../components/button";
import Typography from "../../../components/typography";
import useThemeConfiguration from "../../../hooks/useThemeConfiguration";

export { fieldId, type QuoteDetails };

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
`;

const ErrorText = styled(Typography)`
    margin: 0;
    font-size: 13px;
    color: #d32f2f;
`;

/**
 * Asks for the details configured in the conversion configuration, or just an email when none is configured.
 */
const QuoteForm: FunctionComponent<{
    submitting: boolean;
    onSubmit: (details: QuoteDetails) => void;
    submitLabel?: string;
    submittingLabel?: string;
    /** Details to start the form with. */
    initialValues?: QuoteDetails;
    /** The identifiers of the fields which can't be changed. */
    lockedIds?: string[];
}> = ({
    submitting,
    onSubmit,
    submitLabel = "Request a Quote",
    submittingLabel = "Requesting quote...",
    initialValues,
    lockedIds,
}) => {
    const { conversionConfiguration } = useThemeConfiguration();
    const fields = useMemo<ConversionData[]>(
        () => conversionConfiguration?.requestedDataItems ?? [{ type: ConversionDataType.Email, mandatory: true }],
        [conversionConfiguration],
    );
    const [values, setValues] = useState<QuoteDetails>(initialValues ?? {});

    const missing = missingConversionFields(fields, values);

    return (
        <Form
            onSubmit={(event) => {
                event.preventDefault();
                if (missing.length === 0) onSubmit(values);
            }}
        >
            <ConversionFields
                fields={fields}
                values={values}
                lockedIds={lockedIds}
                onChange={(id, value) => setValues({ ...values, [id]: value })}
            />
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
