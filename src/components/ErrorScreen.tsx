import { FunctionComponent } from "react";
import styled from "styled-components";
import Button from "./button";
import Typography from "./typography";

const Screen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    height: 100%;
    padding: 24px;
    text-align: center;
`;

/**
 * Replaces the whole theme when it can't continue, with a way to try again.
 */
const ErrorScreen: FunctionComponent<{
    title?: string;
    message: string;
    onRetry: () => void;
}> = ({ title = "Something went wrong", message, onRetry }) => {
    return (
        <Screen role="alert">
            <Typography variant="h2">{title}</Typography>
            <Typography>{message}</Typography>
            <Button onClick={onRetry}>Try again</Button>
        </Screen>
    );
};

export default ErrorScreen;
