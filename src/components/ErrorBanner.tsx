import { FunctionComponent } from "react";
import styled from "styled-components";

const Banner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: none;
    padding: 10px 16px;
    font-size: 14px;
    color: #611a15;
    background-color: #fdecea;
    border-bottom: 1px solid #f5c6cb;
`;

const DismissButton = styled.button`
    padding: 0 4px;
    font-size: 20px;
    line-height: 1;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
`;

/**
 * A dismissible message for something that went wrong, shown without taking the customer off their page.
 */
const ErrorBanner: FunctionComponent<{
    message: string;
    onDismiss: () => void;
}> = ({ message, onDismiss }) => {
    return (
        <Banner role="alert">
            <span>{message}</span>
            <DismissButton type="button" aria-label="Dismiss" onClick={onDismiss}>
                ×
            </DismissButton>
        </Banner>
    );
};

export default ErrorBanner;
