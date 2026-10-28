import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData } from "@spiffcommerce/core";
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

interface ColorOption {
    id: string;
    fill?: string;
    stroke?: string;
}

const ShapeUI: FunctionComponent<{
    step: Step<AnyStepData>;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [colors] = useState<ColorOption[]>([]);
    const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
    const [customColor, setCustomColor] = useState("#000000");

    useEffect(() => {
        // TODO: Load colors from step when API is available
    }, [step]);

    const handleColorClick = useCallback(
        (colorId: string) => {
            setSelectedColorId(colorId);
            onActivation?.();
            // TODO: Implement color selection logic
        },
        [onActivation],
    );

    const handleCustomColorChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const color = event.target.value;
            setCustomColor(color);
            onActivation?.();
            // TODO: Implement custom color update logic
        },
        [onActivation],
    );

    if (colors.length === 0) {
        return null;
    }

    return (
        <Container data-test-step-type="shape">
            <ColorGrid>
                {colors.map((color) => (
                    <ColorSwatch
                        key={color.id}
                        color={color.fill || "#cccccc"}
                        selected={selectedColorId === color.id}
                        onClick={() => handleColorClick(color.id)}
                    />
                ))}
            </ColorGrid>
            <CustomColorSection>
                <ColorInput type="color" value={customColor} onChange={handleCustomColorChange} />
            </CustomColorSection>
        </Container>
    );
};

export default ShapeUI;
