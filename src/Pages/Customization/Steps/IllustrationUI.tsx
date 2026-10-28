import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
`;

const VariantGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
`;

const VariantCard = styled.div<{ selected?: boolean }>`
    position: relative;
    aspect-ratio: 1;
    border: 2px solid ${(props) => (props.selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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

interface Variant {
    id: string;
    name: string;
    thumbnail?: string;
}

const IllustrationUI: FunctionComponent<{
    step: Step<AnyStepData>;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [variants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [hasColorPicker] = useState(false);

    useEffect(() => {
        // TODO: Load variants from step when API is available
        // TODO: Check if color picker is enabled
    }, [step]);

    const handleVariantClick = useCallback(
        (variantId: string) => {
            setSelectedVariantId(variantId);
            onActivation?.();
            // TODO: Implement variant selection logic
        },
        [onActivation],
    );

    return (
        <Container data-test-step-type="illustration">
            {variants.length > 1 && (
                <VariantGrid>
                    {variants.map((variant) => (
                        <VariantCard
                            key={variant.id}
                            selected={selectedVariantId === variant.id}
                            onClick={() => handleVariantClick(variant.id)}
                        >
                            {variant.thumbnail && <VariantImage src={variant.thumbnail} alt={variant.name} />}
                            <VariantName>{variant.name}</VariantName>
                        </VariantCard>
                    ))}
                </VariantGrid>
            )}
            {hasColorPicker && (
                <ColorPickerSection>
                    <ColorPickerTitle variant="h3">Color Options</ColorPickerTitle>
                    {/* TODO: Implement SVG color picker */}
                </ColorPickerSection>
            )}
        </Container>
    );
};

export default IllustrationUI;
