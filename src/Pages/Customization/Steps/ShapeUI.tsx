import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience, Variant } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;
`;

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
    width: 100%;
`;

const ColorSwatch = styled.div<{ color: string; selected?: boolean }>`
    aspect-ratio: 1;
    background-color: ${(props) => props.color};
    border: 2px solid ${(props) => (props.selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
`;

const CustomColorSection = styled.div`
    margin-top: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
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

interface ColorOptionDisplay {
    fill?: string;
    stroke?: string;
    variant: { id?: string; color?: string };
}

const ShapeUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [colors, setColors] = useState<ColorOptionDisplay[]>([]);
    const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
    const [customColor, setCustomColor] = useState("#000000");
    const [loading, setLoading] = useState(true);
    const [isCustom, setIsCustom] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setLoading(false);
                return;
            }

            try {
                const availableColors = await (stepHandle as any).getColors?.();
                if (availableColors) {
                    setColors(availableColors);
                }

                const currentVariant = stepHandle.getCurrentVariant();
                if (currentVariant) {
                    setSelectedColorId(currentVariant.getId());
                    const color = currentVariant.getColor();
                    if (color?.toLowerCase() === "#custom") {
                        setIsCustom(true);
                        const customColorValue = (stepHandle as any).getCustomColor?.();
                        if (customColorValue) {
                            setCustomColor(customColorValue);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading shape colors:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleColorClick = useCallback(
        async (colorOption: ColorOptionDisplay) => {
            setSelectedColorId(colorOption.variant.id || null);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle || !colorOption.variant) return;

            try {
                if (colorOption.variant.id || colorOption.variant.color) {
                    await stepHandle.selectVariant(new Variant(colorOption.variant as any));
                    const color = colorOption.variant.color;
                    setIsCustom(color?.toLowerCase() === "#custom");
                }
            } catch (error) {
                console.error("Error selecting color:", error);
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    const handleCustomColorChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const color = event.target.value;
            setCustomColor(color);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            try {
                (stepHandle as any).setCustomColor?.(color);
            } catch (error) {
                console.error("Error setting custom color:", error);
            }
        },
        [onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="shape">Loading...</Container>;
    }

    if (colors.length === 0) {
        return null;
    }

    return (
        <Container data-test-step-type="shape">
            <ColorGrid>
                {colors.map((color, index) => (
                    <ColorSwatch
                        key={color.variant.id || index}
                        color={color.fill || color.stroke || "#cccccc"}
                        selected={selectedColorId === color.variant.id}
                        onClick={() => handleColorClick(color)}
                    />
                ))}
            </ColorGrid>
            {isCustom && (
                <CustomColorSection>
                    <ColorInput type="color" value={customColor} onChange={handleCustomColorChange} />
                </CustomColorSection>
            )}
        </Container>
    );
};

export default ShapeUI;
