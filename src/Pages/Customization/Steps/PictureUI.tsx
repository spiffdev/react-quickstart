import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { PictureStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import useVariantPrice from "../../../hooks/usePricing";

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

const VariantPrice = styled.span`
    display: block;
    font-size: 11px;
    opacity: 0.8;
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

const PictureUI: FunctionComponent<{
    step: PictureStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const getVariantPrice = useVariantPrice();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((error) => console.error("Error loading picture variants:", error))
            .finally(() => setLoading(false));
    }, [step]);

    const handleVariantClick = useCallback(
        async (variant: Variant) => {
            if (updating || !variant.isEnabled()) return;

            setSelectedVariantId(variant.getId());
            setUpdating(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
            } catch (error) {
                console.error("Error selecting picture variant:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step],
    );

    if (loading) {
        return <Container data-test-step-type="picture">Loading...</Container>;
    }

    if (variants.length === 0) {
        return null;
    }

    return (
        <Container data-test-step-type="picture">
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
                        <VariantName>
                            {variant.getName()}
                            {getVariantPrice(variant) && <VariantPrice>{getVariantPrice(variant)}</VariantPrice>}
                        </VariantName>
                    </VariantCard>
                ))}
            </VariantGrid>
        </Container>
    );
};

export default PictureUI;
