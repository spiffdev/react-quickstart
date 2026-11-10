import { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { CircleCheck } from "lucide-react";
import Button from "../../components/button";
import Typography from "../../components/typography";

const Page = styled.div`
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px 16px;
    text-align: center;
    background-color: var(--theme-background-color, #fff);
`;

const Heading = styled(Typography)`
    margin: 0;
    font-size: 28px;
    font-weight: 600;
`;

const Message = styled(Typography)`
    margin: 0;
    max-width: 480px;
    font-size: 16px;
    white-space: pre-line;
`;

const ErrorText = styled(Message)`
    font-size: 13px;
    color: #d32f2f;
`;

/**
 * The last page of the experience. For now it only thanks the customer and lets them leave; later it could offer
 * to add more designs to the bundle.
 *
 * Whatever has to happen for the design to be handed off is prepared as the page loads, and the hand-off itself
 * only happens when the customer leaves.
 */
const ThankYouPage: FunctionComponent<{
    message?: string;
    closeLabel?: string;
    /** The quote the customer requested, if that's how they finished. */
    quoteId?: string;
    /** Prepares the hand-off, resolving with what to do when the customer leaves. */
    onPrepare: () => Promise<() => void>;
}> = ({ message, closeLabel, quoteId, onPrepare }) => {
    const [state, setState] = useState<"preparing" | "ready" | "failed" | "leaving">("preparing");
    const [handOff, setHandOff] = useState<(() => void) | undefined>(undefined);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setState("preparing");
        onPrepare()
            .then((prepared) => {
                if (cancelled) return;
                setHandOff(() => prepared);
                setState("ready");
            })
            .catch(() => !cancelled && setState("failed"));
        return () => {
            cancelled = true;
        };
    }, [onPrepare, attempt]);

    const leave = useCallback(() => {
        setState("leaving");
        try {
            handOff?.();
        } catch (error) {
            console.error("Error leaving the experience:", error);
            setState("ready");
        }
    }, [handOff]);

    return (
        <Page>
            <CircleCheck size={48} color="var(--theme-primary-color)" aria-hidden="true" />
            <Heading variant="h2">Thank you!</Heading>
            {quoteId && <Message>Quote # {quoteId}</Message>}
            <Message>{message || "Your design has been received."}</Message>
            {state === "preparing" && <Message role="status">Finishing up your design...</Message>}
            {state === "failed" && (
                <ErrorText role="alert">We couldn't finish your design. Please try again.</ErrorText>
            )}
            {state === "failed" ? (
                <Button onClick={() => setAttempt((count) => count + 1)}>Try again</Button>
            ) : (
                <Button disabled={state !== "ready"} onClick={leave}>
                    {closeLabel || "Close"}
                </Button>
            )}
        </Page>
    );
};

export default ThankYouPage;
