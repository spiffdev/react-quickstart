import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience } from "@spiffcommerce/core";
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
        border-color: ${(props) => (props.$error ? "#d32f2f" : "#007bff")};
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

const ModuleUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [text, setText] = useState("");
    const [helperText, setHelperText] = useState("Enter text");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setLoading(false);
                return;
            }

            try {
                const currentText = (stepHandle as any).getText?.();
                if (currentText !== undefined) {
                    setText(currentText);
                }
            } catch (error) {
                console.error("Error loading module text:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            setText(value);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                (stepHandle as any).setText?.(value);
                setError(false);
                setHelperText("Enter text");
            } catch (error) {
                console.error("Error setting module text:", error);
                setError(true);
                setHelperText("Error updating text");
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="module">Loading...</Container>;
    }

    return (
        <Container data-test-step-type="module">
            <TextArea
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter your text here..."
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
