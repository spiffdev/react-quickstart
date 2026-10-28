import { FunctionComponent, useCallback, useEffect, useState, useRef } from "react";
import { Step, AnyStepData, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
`;

const TextField = styled.input<{ error?: boolean }>`
    width: 100%;
    padding: 12px;
    border: 1px solid ${(props) => (props.error ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    font-size: 16px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${(props) => (props.error ? "#d32f2f" : "#007bff")};
    }
`;

const HelperText = styled(Typography)<{ error?: boolean }>`
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => (props.error ? "#d32f2f" : "#666")};
`;

const ColorSection = styled.div`
    margin-top: 16px;
`;

const ColorTitle = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
`;

const ColorInput = styled.input`
    width: 100%;
    height: 48px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: 4px;
    }
`;

const TextUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [text, setText] = useState("");
    const [textColor, setTextColor] = useState("#000000");
    const [helperText, setHelperText] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

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

                const fillColor = (stepHandle as any).getFillColor?.();
                if (fillColor) {
                    setTextColor(fillColor);
                }

                const charsRemaining = (stepHandle as any).getCharactersRemaining?.();
                if (charsRemaining !== undefined) {
                    setHelperText(`${charsRemaining} characters remaining`);
                }
            } catch (error) {
                console.error("Error loading text data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleTextChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setText(value);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                const result = (stepHandle as any).setText?.(value);
                if (result) {
                    if (result.valid === false) {
                        setError(true);
                        setHelperText(result.message || "Invalid text");
                    } else {
                        setError(false);
                        const charsRemaining = (stepHandle as any).getCharactersRemaining?.();
                        if (charsRemaining !== undefined) {
                            setHelperText(`${charsRemaining} characters remaining`);
                        } else {
                            setHelperText("");
                        }
                    }
                }
            } catch (error) {
                console.error("Error setting text:", error);
                setError(true);
                setHelperText("Error updating text");
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    const handleColorChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const color = event.target.value;
            setTextColor(color);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                (stepHandle as any).setFillColor?.({ fill: color, variant: { color } });
            } catch (error) {
                console.error("Error setting text color:", error);
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="text">Loading...</Container>;
    }

    return (
        <Container data-test-step-type="text">
            <TextField
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter text..."
                error={error}
            />
            {helperText && (
                <HelperText variant="span" error={error}>
                    {helperText}
                </HelperText>
            )}
            <ColorSection>
                <ColorTitle variant="h3">Text Color</ColorTitle>
                <ColorInput type="color" value={textColor} onChange={handleColorChange} />
            </ColorSection>
        </Container>
    );
};

export default TextUI;
