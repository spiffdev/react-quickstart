import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { PictureStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const PictureUI: FunctionComponent<{
    step: PictureStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
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

    const handleSelect = useCallback(
        async (variant: Variant) => {
            if (updating) return;

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
            <VariantGallery
                variants={variants}
                selectedVariantId={selectedVariantId}
                disabled={updating}
                searchEnabled={step.isVariantSearchEnabled()}
                categoriesEnabled={step.isVariantCategoriesEnabled()}
                onSelect={handleSelect}
            />
        </Container>
    );
};

export default PictureUI;
