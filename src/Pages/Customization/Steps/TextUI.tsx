import { FunctionComponent, useCallback, useEffect, useState, useRef } from "react";
import { Step, AnyStepData, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const TextField = styled.input<{ $error?: boolean }>`
    width: 100%;
    padding: 12px;
    border: 1px solid ${(props) => (props.$error ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    font-size: 16px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${(props) => (props.$error ? "#d32f2f" : "#007bff")};
    }
`;

const HelperText = styled(Typography)<{ $error?: boolean }>`
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => (props.$error ? "#d32f2f" : "#666")};
`;

const ColorSection = styled.div`
    margin-top: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const ColorTitle = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
`;

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
`;

const ColorSwatch = styled.div<{ $color: string; $selected?: boolean }>`
    aspect-ratio: 1;
    background-color: ${(props) => props.$color};
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
`;

const StrokeSection = styled.div`
    margin-top: 16px;
`;

const StrokeTitle = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #616161;
`;

interface ColorOptionDisplay {
    fill?: string;
    stroke?: string;
    variant: { id?: string; color?: string };
}

const TextUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [text, setText] = useState("");
    const [helperText, setHelperText] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fillColors, setFillColors] = useState<ColorOptionDisplay[]>([]);
    const [strokeColors, setStrokeColors] = useState<ColorOptionDisplay[]>([]);
    const [selectedFillColorId, setSelectedFillColorId] = useState<string | null>(null);
    const [selectedStrokeColorId, setSelectedStrokeColorId] = useState<string | null>(null);
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

                const charsRemaining = (stepHandle as any).getCharactersRemaining?.();
                if (charsRemaining !== undefined) {
                    setHelperText(`${charsRemaining} characters remaining`);
                }

                // Load available fill colors
                const availableFillColors = await (stepHandle as any).getAvailableFillColors?.();
                if (availableFillColors && availableFillColors.length > 0) {
                    setFillColors(availableFillColors);

                    // Get current fill color
                    const currentFillColor = (stepHandle as any).getFillColor?.();
                    if (currentFillColor) {
                        const foundColor = availableFillColors.find(
                            (c: ColorOptionDisplay) =>
                                c.fill === currentFillColor ||
                                c.variant?.color === currentFillColor ||
                                c.stroke === currentFillColor,
                        );
                        if (foundColor && foundColor.variant?.id) {
                            setSelectedFillColorId(foundColor.variant.id);
                        }
                    }
                }

                // Load available stroke colors
                const availableStrokeColors = await (stepHandle as any).getAvailableStrokeColors?.();
                if (availableStrokeColors && availableStrokeColors.length > 0) {
                    setStrokeColors(availableStrokeColors);

                    // Get current stroke color
                    const currentStrokeColor = (stepHandle as any).getStrokeColor?.();
                    if (currentStrokeColor) {
                        const foundColor = availableStrokeColors.find(
                            (c: ColorOptionDisplay) =>
                                c.stroke === currentStrokeColor ||
                                c.variant?.color === currentStrokeColor ||
                                c.fill === currentStrokeColor,
                        );
                        if (foundColor && foundColor.variant?.id) {
                            setSelectedStrokeColorId(foundColor.variant.id);
                        }
                    }
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

    const handleFillColorClick = useCallback(
        async (colorOption: ColorOptionDisplay) => {
            setSelectedFillColorId(colorOption.variant.id || null);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                await (stepHandle as any).setFillColor?.(colorOption);
            } catch (error) {
                console.error("Error setting fill color:", error);
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    const handleStrokeColorClick = useCallback(
        async (colorOption: ColorOptionDisplay) => {
            setSelectedStrokeColorId(colorOption.variant.id || null);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                await (stepHandle as any).setStrokeColor?.(colorOption);
            } catch (error) {
                console.error("Error setting stroke color:", error);
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="text">Loading...</Container>;
    }

    const hasFillColors = fillColors.length > 0;
    const hasStrokeColors = strokeColors.length > 0;

    return (
        <Container data-test-step-type="text">
            <TextField
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter text..."
                $error={error}
            />
            {helperText && (
                <HelperText variant="span" $error={error}>
                    {helperText}
                </HelperText>
            )}
            {hasFillColors && (
                <ColorSection>
                    <ColorTitle variant="h3">Text Color</ColorTitle>
                    <ColorGrid>
                        {fillColors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant.id || index}
                                $color={color.fill || color.stroke || "#000000"}
                                $selected={selectedFillColorId === color.variant.id}
                                onClick={() => handleFillColorClick(color)}
                            />
                        ))}
                    </ColorGrid>
                </ColorSection>
            )}
            {hasStrokeColors && (
                <StrokeSection>
                    <StrokeTitle variant="h3">Text Stroke</StrokeTitle>
                    <ColorGrid>
                        {strokeColors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant.id || index}
                                $color={color.stroke || color.fill || "#000000"}
                                $selected={selectedStrokeColorId === color.variant.id}
                                onClick={() => handleStrokeColorClick(color)}
                            />
                        ))}
                    </ColorGrid>
                </StrokeSection>
            )}
        </Container>
    );
};

export default TextUI;
