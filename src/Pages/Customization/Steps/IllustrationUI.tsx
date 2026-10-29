import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { ColorDefinition, IllustrationStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const ColorPickerSection = styled.div`
    margin-top: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const ColorPickerTitle = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
`;

const ColorRowTitle = styled(Typography)`
    margin: 8px 0;
    font-size: 12px;
    color: #616161;
`;

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 8px;
    width: 100%;
`;

const ColorSwatch = styled.div<{ $color: string; $selected?: boolean }>`
    aspect-ratio: 1;
    background-color: ${(props) => props.$color};
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: scale(1.1);
    }
`;

const CustomColorInput = styled.input`
    width: 100%;
    height: 40px;
    margin-top: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
`;

type AvailableColor = NonNullable<Awaited<ReturnType<IllustrationStepHandle["getAvailableColors"]>>>[number];

const isCustomColor = (color: AvailableColor) => color.variant.color?.toLowerCase() === "#custom";
const availableColorValue = (color: AvailableColor) => color.fill ?? color.stroke ?? color.variant.color;

const IllustrationUI: FunctionComponent<{
    step: IllustrationStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [availableColors, setAvailableColors] = useState<AvailableColor[]>([]);
    const [existingColors, setExistingColors] = useState<{ [key: string]: ColorDefinition } | undefined>(() =>
        step.getColors(),
    );
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [allVariants, colors] = await Promise.all([step.getAllVariants(), step.getAvailableColors()]);
                setVariants(allVariants || []);
                setAvailableColors(colors || []);
            } catch (error) {
                console.error("Error loading illustration step:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step]);

    const handleVariantSelect = useCallback(
        async (variant: Variant) => {
            if (updating) return;

            setSelectedVariantId(variant.getId());
            setUpdating(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
                setExistingColors(step.getColors());
            } catch (error) {
                console.error("Error selecting illustration variant:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step],
    );

    const applyColor = useCallback(
        async (key: string, value: string, pmsValue?: string) => {
            if (updating) return;

            setUpdating(true);
            onActivation?.();

            try {
                await step.setColor(key, value, pmsValue);
                setExistingColors(step.getColors());
            } catch (error) {
                console.error("Error setting illustration color:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step],
    );

    if (loading) {
        return <Container data-test-step-type="illustration">Loading...</Container>;
    }

    const colorKeys = Object.keys(existingColors ?? {});
    const showColorPicker = step.isColorPickerEnabled() && colorKeys.length > 0 && availableColors.length > 0;
    const hasCustomColor = availableColors.some(isCustomColor);

    return (
        <Container data-test-step-type="illustration">
            {variants.length > 1 && (
                <VariantGallery
                    variants={variants}
                    selectedVariantId={selectedVariantId}
                    disabled={updating}
                    searchEnabled={step.isVariantSearchEnabled()}
                    categoriesEnabled={step.isVariantCategoriesEnabled()}
                    onSelect={handleVariantSelect}
                />
            )}
            {showColorPicker && (
                <ColorPickerSection>
                    <ColorPickerTitle variant="h3">Color Options</ColorPickerTitle>
                    {colorKeys.map((key, index) => (
                        <div key={key}>
                            {colorKeys.length > 1 && <ColorRowTitle variant="p">Color {index + 1}</ColorRowTitle>}
                            <ColorGrid>
                                {availableColors
                                    .filter((color) => !isCustomColor(color))
                                    .map((color, colorIndex) => {
                                        const value = availableColorValue(color);
                                        return (
                                            <ColorSwatch
                                                key={color.variant.id || colorIndex}
                                                $color={value || "#cccccc"}
                                                $selected={
                                                    !!value &&
                                                    existingColors?.[key]?.browserValue.toLowerCase() ===
                                                        value.toLowerCase()
                                                }
                                                onClick={() => value && applyColor(key, value, color.pmsValue)}
                                            />
                                        );
                                    })}
                            </ColorGrid>
                            {hasCustomColor && (
                                <CustomColorInput
                                    type="color"
                                    aria-label={`Custom color ${index + 1}`}
                                    value={existingColors?.[key]?.browserValue ?? "#000000"}
                                    onChange={(event) => applyColor(key, event.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </ColorPickerSection>
            )}
        </Container>
    );
};

export default IllustrationUI;
