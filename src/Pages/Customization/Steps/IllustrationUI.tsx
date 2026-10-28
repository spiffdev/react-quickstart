import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { ColorDefinition, IllustrationStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const VariantGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
`;

const VariantCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
    position: relative;
    aspect-ratio: 1;
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
    overflow: hidden;
    transition: all 0.2s;
    opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

    &:hover {
        border-color: ${(props) => (props.$disabled ? "#e0e0e0" : "#007bff")};
        transform: ${(props) => (props.$disabled ? "none" : "translateY(-2px)")};
        box-shadow: ${(props) => (props.$disabled ? "none" : "0 4px 8px rgba(0, 0, 0, 0.1)")};
    }
`;

const VariantImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const VariantName = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    text-align: center;
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

type AvailableColor = NonNullable<Awaited<ReturnType<IllustrationStepHandle["getAvailableColors"]>>>[number];

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

    const handleVariantClick = useCallback(
        async (variant: Variant) => {
            if (updating || !variant.isEnabled()) return;

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

    const handleColorClick = useCallback(
        async (key: string, color: AvailableColor) => {
            const value = availableColorValue(color);
            if (updating || !value) return;

            setUpdating(true);
            onActivation?.();

            try {
                await step.setColor(key, value, color.pmsValue);
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

    return (
        <Container data-test-step-type="illustration">
            {variants.length > 1 && (
                <VariantGrid>
                    {variants.map((variant) => (
                        <VariantCard
                            key={variant.getId()}
                            $selected={selectedVariantId === variant.getId()}
                            $disabled={updating || !variant.isEnabled()}
                            onClick={() => handleVariantClick(variant)}
                        >
                            {variant.getThumbnail() && (
                                <VariantImage src={variant.getThumbnail()} alt={variant.getName()} />
                            )}
                            <VariantName>{variant.getName()}</VariantName>
                        </VariantCard>
                    ))}
                </VariantGrid>
            )}
            {showColorPicker && (
                <ColorPickerSection>
                    <ColorPickerTitle variant="h3">Color Options</ColorPickerTitle>
                    {colorKeys.map((key, index) => (
                        <div key={key}>
                            {colorKeys.length > 1 && <ColorRowTitle variant="p">Color {index + 1}</ColorRowTitle>}
                            <ColorGrid>
                                {availableColors.map((color, colorIndex) => {
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
                                            onClick={() => handleColorClick(key, color)}
                                        />
                                    );
                                })}
                            </ColorGrid>
                        </div>
                    ))}
                </ColorPickerSection>
            )}
        </Container>
    );
};

export default IllustrationUI;
