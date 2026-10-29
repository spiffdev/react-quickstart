import { ChangeEvent, FunctionComponent, useCallback, useEffect, useState } from "react";
import { ColorOption, TextChangeResult, TextStepHandle, Variant, WorkflowManager } from "@spiffcommerce/core";
import styled, { css } from "styled-components";
import Typography from "../../../components/typography";
import { swatchBackground } from "../components/customColor";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const fieldStyles = css<{ $error?: boolean }>`
    width: 100%;
    padding: 12px;
    border: 1px solid ${(props) => (props.$error ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${(props) => (props.$error ? "#d32f2f" : "#007bff")};
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const TextField = styled.input<{ $error?: boolean }>`
    ${fieldStyles}
`;

const TextArea = styled.textarea<{ $error?: boolean }>`
    ${fieldStyles}
    min-height: 80px;
    resize: vertical;
`;

const HelperText = styled(Typography)<{ $error?: boolean }>`
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => (props.$error ? "#d32f2f" : "#666")};
`;

const EditAllLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 13px;
    cursor: pointer;
`;

const Section = styled.div`
    margin-top: 16px;
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
    background: ${(props) => props.$color};
    background-size: cover;
    background-position: center;
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
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const [text, setText] = useState(() => step.getText());
    const [helperText, setHelperText] = useState(() => remainingText(step.getCharactersRemaining()));
    const [error, setError] = useState(false);
    const [customiseAllText, setCustomiseAllText] = useState(
        () => !!workflowManager.getStepStorage(step.getId())?.customiseAllText,
    );
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [variantPending, setVariantPending] = useState(false);
    const [fillColors, setFillColors] = useState<ColorOption[]>([]);
    const [strokeColors, setStrokeColors] = useState<ColorOption[]>([]);
    const [imageFills, setImageFills] = useState<Awaited<ReturnType<TextStepHandle["getAvailableFillImages"]>>>([]);
    const [selectedFill, setSelectedFill] = useState<string | undefined>(() => step.getFillColor());
    const [selectedStroke, setSelectedStroke] = useState<string | undefined>(() => step.getStrokeColor());
    const [selectedImage, setSelectedImage] = useState<string | undefined>(() => step.getFillImage()?.src);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((loadError) => console.error("Error loading text variants:", loadError));
        step.getAvailableFillColors()
            .then(setFillColors)
            .catch((loadError) => console.error("Error loading fill colors:", loadError));
        step.getAvailableStrokeColors()
            .then(setStrokeColors)
            .catch((loadError) => console.error("Error loading stroke colors:", loadError));
        step.getAvailableFillImages()
            .then(setImageFills)
            .catch((loadError) => console.error("Error loading fill images:", loadError));
    }, [step]);

    const applyResult = useCallback((result: TextChangeResult) => {
        const message = errorMessage(result);
        setError(!!message);
        setHelperText(message ?? remainingText(result.helperData.charactersRemaining));
    }, []);

    const handleTextChange = useCallback(
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = event.target.value;
            setText(value);
            onActivation?.();
            applyResult(step.setText(value));
        },
        [applyResult, onActivation, step],
    );

    const handleFocus = useCallback(() => {
        onActivation?.();
        const result = step.clearDefaultTextIfNecessary();
        if (result) {
            setText(result.input);
        }
    }, [onActivation, step]);

    const handleCustomiseAllChange = useCallback(
        (checked: boolean) => {
            setCustomiseAllText(checked);
            const result = step.setFullTextCustomization(checked);
            setText(result.input);
            applyResult(result);
        },
        [applyResult, step],
    );

    const handleVariantSelect = useCallback(
        async (variant: Variant) => {
            if (variantPending) return;

            setSelectedVariantId(variant.getId());
            setVariantPending(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
            } catch (selectError) {
                console.error("Error selecting text variant:", selectError);
            } finally {
                setVariantPending(false);
            }
        },
        [onActivation, step, variantPending],
    );

    const handleFillColorClick = useCallback(
        async (color: ColorOption) => {
            setSelectedFill(fillValue(color));
            onActivation?.();

            try {
                await step.setFillColor(color);
            } catch (fillError) {
                console.error("Error setting fill color:", fillError);
            }
        },
        [onActivation, step],
    );

    const handleFillImageClick = useCallback(
        async (fillImage: (typeof imageFills)[number]) => {
            setSelectedImage(fillImage.src);
            onActivation?.();

            try {
                await step.setFillImage(fillImage);
            } catch (fillError) {
                console.error("Error setting fill image:", fillError);
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
            } catch (strokeError) {
                console.error("Error setting stroke color:", strokeError);
            }
        },
        [onActivation, step],
    );

    const showImageFills = imageFills.length > 1;
    const showFillColors = !showImageFills && !!step.hasColorPicker() && fillColors.length > 0;
    const showStrokeColors = strokeColors.length > 0;
    const fieldProps = {
        value: text,
        onChange: handleTextChange,
        onFocus: handleFocus,
        placeholder: "Enter text...",
        disabled: variantPending,
        $error: error,
    };

    return (
        <Container data-test-step-type="text">
            {step.newLinesSupported() ? <TextArea {...fieldProps} /> : <TextField type="text" {...fieldProps} />}
            {helperText && (
                <HelperText variant="span" $error={error}>
                    {helperText}
                </HelperText>
            )}
            {step.isReplaceable() && (
                <EditAllLabel>
                    <input
                        type="checkbox"
                        checked={customiseAllText}
                        disabled={variantPending}
                        onChange={(event) => handleCustomiseAllChange(event.target.checked)}
                    />
                    Edit all text
                </EditAllLabel>
            )}
            {variants.length > 1 && (
                <Section>
                    <VariantGallery
                        variants={variants}
                        selectedVariantId={selectedVariantId}
                        disabled={variantPending}
                        categoriesEnabled={step.isVariantCategoriesEnabled()}
                        onSelect={handleVariantSelect}
                    />
                </Section>
            )}
            {showImageFills && (
                <ColorSection>
                    <ColorTitle variant="h3">Text Fill</ColorTitle>
                    <ColorGrid>
                        {imageFills.map((fillImage) => (
                            <ColorSwatch
                                key={fillImage.src}
                                $color="transparent"
                                $selected={selectedImage === fillImage.src}
                                style={{ backgroundImage: `url("${fillImage.src.replace(/"/g, "%22")}")` }}
                                onClick={() => handleFillImageClick(fillImage)}
                            />
                        ))}
                    </ColorGrid>
                </ColorSection>
            )}
            {showFillColors && (
                <ColorSection>
                    <ColorTitle variant="h3">Text Color</ColorTitle>
                    {fillColors.some((color) => !!color.variant?.thumbnail) ? (
                        <VariantGallery
                            variants={fillColors.map(
                                (color) =>
                                    new Variant({
                                        name: fillValue(color) ?? "",
                                        enabled: true,
                                        priceModifier: 0,
                                        ...color.variant,
                                        color: color.variant?.color || fillValue(color),
                                    }),
                            )}
                            selectedVariantId={
                                fillColors.find((color) => fillValue(color) === selectedFill)?.variant?.id
                            }
                            onSelect={(variant) => {
                                const color = fillColors.find((c) => c.variant?.id === variant.getId());
                                if (color) handleFillColorClick(color);
                            }}
                        />
                    ) : (
                        <ColorGrid>
                            {fillColors.map((color, index) => (
                                <ColorSwatch
                                    key={color.variant?.id || index}
                                    $color={swatchBackground(fillValue(color), "#000000")}
                                    $selected={selectedFill !== undefined && selectedFill === fillValue(color)}
                                    onClick={() => handleFillColorClick(color)}
                                />
                            ))}
                        </ColorGrid>
                    )}
                </ColorSection>
            )}
            {showStrokeColors && (
                <StrokeSection>
                    <StrokeTitle variant="h3">Text Stroke</StrokeTitle>
                    <ColorGrid>
                        {strokeColors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant?.id || index}
                                $color={swatchBackground(strokeValue(color), "#000000")}
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
