import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { ColorOption, TextChangeResult, TextStepHandle } from "@spiffcommerce/core";
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

const fillValue = (color: ColorOption) => color.fill ?? color.variant?.color ?? color.stroke;
const strokeValue = (color: ColorOption) => color.stroke ?? color.variant?.color ?? color.fill;

const errorMessage = (result: TextChangeResult) => {
    const errors = result.errorData;
    if (!errors) return undefined;
    if (errors.blockedProfanity) return "Text contains blocked words";
    if (errors.unsupportedCharacters) return "Text contains unsupported characters";
    if (errors.illegalMultipleLines) return "New lines are not supported";
    if (errors.doesNotFit) return "Text does not fit";
    if (errors.hitCharacterLimit) return "Character limit reached";
    return undefined;
};

const remainingText = (remaining: number | undefined) =>
    remaining !== undefined ? `${remaining} characters remaining` : "";

const TextUI: FunctionComponent<{
    step: TextStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [text, setText] = useState(() => step.getText());
    const [helperText, setHelperText] = useState(() => remainingText(step.getCharactersRemaining()));
    const [error, setError] = useState(false);
    const [fillColors, setFillColors] = useState<ColorOption[]>([]);
    const [strokeColors, setStrokeColors] = useState<ColorOption[]>([]);
    const [selectedFill, setSelectedFill] = useState<string | undefined>(() => step.getFillColor());
    const [selectedStroke, setSelectedStroke] = useState<string | undefined>(() => step.getStrokeColor());

    useEffect(() => {
        step.getAvailableFillColors()
            .then(setFillColors)
            .catch((error) => console.error("Error loading fill colors:", error));
        step.getAvailableStrokeColors()
            .then(setStrokeColors)
            .catch((error) => console.error("Error loading stroke colors:", error));
    }, [step]);

    const handleTextChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setText(value);
            onActivation?.();

            const result = step.setText(value);
            const message = errorMessage(result);
            setError(!!message);
            setHelperText(message ?? remainingText(result.helperData.charactersRemaining));
        },
        [onActivation, step],
    );

    const handleFillColorClick = useCallback(
        async (color: ColorOption) => {
            setSelectedFill(fillValue(color));
            onActivation?.();

            try {
                await step.setFillColor(color);
            } catch (error) {
                console.error("Error setting fill color:", error);
            }
        },
        [onActivation, step],
    );

    const handleStrokeColorClick = useCallback(
        async (color: ColorOption) => {
            setSelectedStroke(strokeValue(color));
            onActivation?.();

            try {
                await step.setStrokeColor(color);
            } catch (error) {
                console.error("Error setting stroke color:", error);
            }
        },
        [onActivation, step],
    );

    const showFillColors = !!step.hasColorPicker() && fillColors.length > 0;
    const showStrokeColors = strokeColors.length > 0;

    return (
        <Container data-test-step-type="text">
            <TextField
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
            {showFillColors && (
                <ColorSection>
                    <ColorTitle variant="h3">Text Color</ColorTitle>
                    <ColorGrid>
                        {fillColors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant?.id || index}
                                $color={fillValue(color) || "#000000"}
                                $selected={selectedFill !== undefined && selectedFill === fillValue(color)}
                                onClick={() => handleFillColorClick(color)}
                            />
                        ))}
                    </ColorGrid>
                </ColorSection>
            )}
            {showStrokeColors && (
                <StrokeSection>
                    <StrokeTitle variant="h3">Text Stroke</StrokeTitle>
                    <ColorGrid>
                        {strokeColors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant?.id || index}
                                $color={strokeValue(color) || "#000000"}
                                $selected={selectedStroke !== undefined && selectedStroke === strokeValue(color)}
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
