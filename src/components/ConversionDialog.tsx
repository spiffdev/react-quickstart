import { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import QuoteForm, { type QuoteDetails } from "../Pages/Customization/components/QuoteForm";

const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 10000; /* Above the loading overlay (9999) */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.5);
`;

const Dialog = styled.div`
    width: 100%;
    max-width: 420px;
    max-height: 100%;
    overflow-y: auto;
    padding: 24px;
    border-radius: 8px;
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
`;

const Title = styled.h2`
    margin: 0;
    font-size: 18px;
`;

const SkipButton = styled(Button)`
    margin-top: 12px;
    color: var(--theme-primary-color);
    background-color: transparent;

    &:hover:not(:disabled) {
        color: var(--theme-primary-contrast-color);
    }
`;

/**
 * Asks the customer for the details in the conversion configuration. Unless the configuration marks it as
 * mandatory, the customer can skip it.
 */
const ConversionDialog: FunctionComponent<{
    mandatory: boolean;
    onSubmit: (details: QuoteDetails) => Promise<void>;
    onSkip: () => void;
}> = ({ mandatory, onSubmit, onSkip }) => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const handleSubmit = async (details: QuoteDetails) => {
        setSubmitting(true);
        setError(undefined);
        try {
            await onSubmit(details);
        } catch (caught) {
            console.error("Error saving the customer's details:", caught);
            setError("We couldn't save your details. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <Backdrop>
            <Dialog role="dialog" aria-modal="true" aria-labelledby="conversion-title">
                <Title id="conversion-title">Your details</Title>
                {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
                <QuoteForm
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    submitLabel="Continue"
                    submittingLabel="Saving..."
                />
                {!mandatory && (
                    <SkipButton fullWidth disabled={submitting} onClick={onSkip}>
                        Skip
                    </SkipButton>
                )}
            </Dialog>
        </Backdrop>
    );
};

export default ConversionDialog;
