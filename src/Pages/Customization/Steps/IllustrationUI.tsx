import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience, Variant } from "@spiffcommerce/core";
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

interface ColorOptionDisplay {
    fill?: string;
    stroke?: string;
    variant: { id?: string; color?: string };
}

const IllustrationUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [colors, setColors] = useState<ColorOptionDisplay[]>([]);
    const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setLoading(false);
                return;
            }

            try {
                const allVariants = await stepHandle.getAllVariants();
                setVariants(allVariants || []);

                const currentVariant = stepHandle.getCurrentVariant();
                if (currentVariant) {
                    setSelectedVariantId(currentVariant.getId());
                }

                // Try to load available colors if the step supports it
                const availableColors = await (stepHandle as any).getAvailableColors?.();
                if (availableColors && availableColors.length > 0) {
                    setColors(availableColors);
                }
            } catch (error) {
                console.error("Error loading illustration data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleVariantClick = useCallback(
        async (variant: Variant) => {
            if (updating || !variant.isEnabled()) return;

            setSelectedVariantId(variant.getId());
            setUpdating(true);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setUpdating(false);
                return;
            }

            try {
                await stepHandle.selectVariant(variant);
            } catch (error) {
                console.error("Error selecting illustration variant:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step.stepName, workflowExperience],
    );

    const handleColorClick = useCallback(
        async (colorOption: ColorOptionDisplay, colorClass: string) => {
            if (updating) return;

            setSelectedColorId(colorOption.variant.id || null);
            setUpdating(true);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setUpdating(false);
                return;
            }

            try {
                const color = colorOption.fill || colorOption.stroke;
                if (color) {
                    await (stepHandle as any).setColor?.(colorClass, color);
                }
            } catch (error) {
                console.error("Error setting illustration color:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="illustration">Loading...</Container>;
    }

    const hasMultipleVariants = variants.length > 1;
    const hasColorPicker = colors.length > 0;

    return (
        <Container data-test-step-type="illustration">
            {hasMultipleVariants && (
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
            {hasColorPicker && (
                <ColorPickerSection>
                    <ColorPickerTitle variant="h3">Color Options</ColorPickerTitle>
                    <ColorGrid>
                        {colors.map((color, index) => (
                            <ColorSwatch
                                key={color.variant.id || index}
                                $color={color.fill || color.stroke || "#cccccc"}
                                $selected={selectedColorId === color.variant.id}
                                onClick={() => handleColorClick(color, "fill")}
                            />
                        ))}
                    </ColorGrid>
                </ColorPickerSection>
            )}
        </Container>
    );
};

export default IllustrationUI;
