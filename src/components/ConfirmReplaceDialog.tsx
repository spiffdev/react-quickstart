import { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Button from "./button";

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
    padding: 24px;
    border-radius: 8px;
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
`;

const Title = styled.h2`
    margin: 0 0 8px;
    font-size: 18px;
`;

const Message = styled.p`
    margin: 0 0 16px;
    font-size: 14px;
    line-height: 1.4;
`;

const Remember = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    cursor: pointer;
`;

const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
`;

const CancelButton = styled(Button)`
    color: var(--theme-primary-color);
    background-color: transparent;

    &:hover:not(:disabled) {
        color: var(--theme-primary-contrast-color);
    }
`;

const COPY = {
    title: "Change collection?",
    message:
        "Changing your collection will remove everything in your cart, along with any designs you have made. This can't be undone. Do you want to continue?",
    confirm: "Change collection",
};

/**
 * Warns the customer that changing their collection discards everything in their cart.
 * "Don't ask again" is only reported to the caller, which keeps it in memory.
 */
const ConfirmReplaceDialog: FunctionComponent<{
    onConfirm: (dontAskAgain: boolean) => void;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
    const [dontAskAgain, setDontAskAgain] = useState(false);

    return (
        <Backdrop>
            <Dialog role="alertdialog" aria-modal="true" aria-labelledby="confirm-replace-title">
                <Title id="confirm-replace-title">{COPY.title}</Title>
                <Message>{COPY.message}</Message>
                <Remember>
                    <input
                        type="checkbox"
                        checked={dontAskAgain}
                        onChange={(event) => setDontAskAgain(event.target.checked)}
                    />
                    Don't ask me again
                </Remember>
                <Actions>
                    <CancelButton onClick={onCancel}>Cancel</CancelButton>
                    <Button onClick={() => onConfirm(dontAskAgain)}>{COPY.confirm}</Button>
                </Actions>
            </Dialog>
        </Backdrop>
    );
};

export default ConfirmReplaceDialog;
