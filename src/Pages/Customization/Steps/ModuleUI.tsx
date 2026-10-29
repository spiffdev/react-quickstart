import { ChangeEvent, FunctionComponent, useCallback, useEffect, useState } from "react";
import { InformationMessageType, ModuleStepHandle, WorkflowManager } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const TextArea = styled.textarea<{ $error?: boolean }>`
    width: 100%;
    min-height: 100px;
    padding: 12px;
    border: 1px solid ${(props) => (props.$error ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: ${(props) => (props.$error ? "#d32f2f" : "var(--theme-primary-color)")};
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const HelperText = styled(Typography)<{ $error?: boolean }>`
    margin-top: 8px;
    font-size: 13px;
    color: ${(props) => (props.$error ? "#d32f2f" : "#666")};
`;

const remainingText = (step: ModuleStepHandle) => {
    const remaining = step.getCharactersRemaining();
    return remaining !== undefined ? `${remaining} characters remaining` : "";
};

const ModuleUI: FunctionComponent<{
    step: ModuleStepHandle;
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const [text, setText] = useState(() => step.getText());
    const [helperText, setHelperText] = useState(() => remainingText(step));
    const [error, setError] = useState(false);
    const [initialised, setInitialised] = useState(false);

    useEffect(() => {
        workflowManager.addInitCallback((stepInitialised) => {
            setInitialised(stepInitialised[step.getId()] || false);
        });
    }, [step, workflowManager]);

    const handleTextChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            const value = event.target.value;
            onActivation?.();
            step.setText(value);
            setText(value);

            const firstError = workflowManager
                .getInformationResults()
                .find(
                    (result) => result.stepID === step.getId() && result.messageType === InformationMessageType.Error,
                );
            setError(!!firstError);
            setHelperText(firstError?.message ?? remainingText(step));
        },
        [onActivation, step, workflowManager],
    );

    return (
        <Container data-test-step-type="module">
            <TextArea
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter your text here..."
                disabled={!initialised}
                $error={error}
            />
            {helperText && (
                <HelperText variant="span" $error={error}>
                    {helperText}
                </HelperText>
            )}
        </Container>
    );
};

export default ModuleUI;
