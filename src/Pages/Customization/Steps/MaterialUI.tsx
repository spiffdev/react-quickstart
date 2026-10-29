import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { MaterialStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const MaterialUI: FunctionComponent<{
    step: MaterialStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((error) => console.error("Error loading material variants:", error))
            .finally(() => setLoading(false));
    }, [step]);

    const handleSelect = useCallback(
        async (variant: Variant) => {
            if (applying) return;

            setSelectedVariantId(variant.getId());
            setApplying(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
            } catch (error) {
                console.error("Error selecting material variant:", error);
            } finally {
                setApplying(false);
            }
        },
        [applying, onActivation, step],
    );

    if (loading) {
        return <Container data-test-step-type="material">Loading...</Container>;
    }

    if (variants.length === 0) {
        return null;
    }

    return (
        <Container data-test-step-type="material">
            <VariantGallery
                variants={variants}
                selectedVariantId={selectedVariantId}
                disabled={applying}
                categoriesEnabled={step.isVariantCategoriesEnabled()}
                onSelect={handleSelect}
            />
        </Container>
    );
};

export default MaterialUI;
