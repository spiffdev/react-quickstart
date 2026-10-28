import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { ShapeStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
    width: 100%;
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

type ShapeColor = Awaited<ReturnType<ShapeStepHandle["getColors"]>>[number];

const isCustomVariant = (variant: Variant | undefined) => variant?.getColor()?.toLowerCase() === "#custom";

const ShapeUI: FunctionComponent<{
    step: ShapeStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [colors, setColors] = useState<ShapeColor[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [isCustom, setIsCustom] = useState(() => isCustomVariant(step.getCurrentVariant()));
    const [customColor, setCustomColor] = useState(() => step.getCustomColor());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        step.getColors()
            .then(setColors)
            .catch((error) => console.error("Error loading shape colors:", error))
            .finally(() => setLoading(false));
    }, [step]);

    const handleColorClick = useCallback(
        async (colorOption: ShapeColor) => {
            setSelectedVariantId(colorOption.variant.id);
            onActivation?.();

            try {
                await step.selectVariant(new Variant(colorOption.variant));
                setIsCustom(isCustomVariant(step.getCurrentVariant()));
            } catch (error) {
                console.error("Error selecting color:", error);
            }
        },
        [onActivation, step],
    );

    const handleCustomColorChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const color = event.target.value;
            setCustomColor(color);
            onActivation?.();
            step.setCustomColor(color);
        },
        [onActivation, step],
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
                        $color={color.fill || color.stroke || "#cccccc"}
                        $selected={selectedVariantId === color.variant.id}
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
