import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience, Variant } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;
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

const MaterialUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);

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
            } catch (error) {
                console.error("Error loading material variants:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleVariantClick = useCallback(
        async (variant: Variant) => {
            if (applying || !variant.isEnabled()) return;

            setSelectedVariantId(variant.getId());
            setApplying(true);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) {
                setApplying(false);
                return;
            }

            try {
                await stepHandle.selectVariant(variant);
            } catch (error) {
                console.error("Error selecting material variant:", error);
            } finally {
                setApplying(false);
            }
        },
        [applying, onActivation, step.stepName, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="material">Loading...</Container>;
    }

    if (variants.length === 0) {
        return null;
    }

    return (
        <Container data-test-step-type="material">
            <VariantGrid>
                {variants.map((variant) => (
                    <VariantCard
                        key={variant.getId()}
                        $selected={selectedVariantId === variant.getId()}
                        $disabled={applying || !variant.isEnabled()}
                        onClick={() => handleVariantClick(variant)}
                    >
                        {variant.getThumbnail() && (
                            <VariantImage src={variant.getThumbnail()} alt={variant.getName()} />
                        )}
                        <VariantName>{variant.getName()}</VariantName>
                    </VariantCard>
                ))}
            </VariantGrid>
        </Container>
    );
};

export default MaterialUI;
