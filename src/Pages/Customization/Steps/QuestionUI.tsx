import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { QuestionStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import useVariantPrice from "../../../hooks/usePricing";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const Select = styled.select`
    width: 100%;
    padding: 12px 15px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #007bff;
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const Option = styled.option`
    padding: 12px;
`;

const QuestionUI: FunctionComponent<{
    step: QuestionStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const getVariantPrice = useVariantPrice();
    const [selectedValue, setSelectedValue] = useState(() => step.getCurrentVariant()?.getId() ?? "");
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);
    const [displayType, setDisplayType] = useState<string | undefined>(undefined);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [allVariants, type] = await Promise.all([step.getAllVariants(), step.getDisplayType()]);
                setVariants(allVariants || []);
                setDisplayType(type);
            } catch (error) {
                console.error("Error loading question step:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step]);

    const selectVariant = useCallback(
        async (variant: Variant) => {
            if (updating || !variant.isEnabled()) return;

            setSelectedValue(variant.getId());
            setUpdating(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
            } catch (error) {
                console.error("Error selecting variant:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step],
    );

    const handleDropdownChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            const variant = variants.find((v) => v.getId() === event.target.value);
            if (variant) {
                selectVariant(variant);
            }
        },
        [selectVariant, variants],
    );

    if (loading) {
        return <Container data-test-step-type="question">Loading...</Container>;
    }

    const isGalleryMode = displayType?.toLowerCase() === "gallery";

    return (
        <Container data-test-step-type="question">
            {isGalleryMode ? (
                <VariantGallery
                    variants={variants}
                    selectedVariantId={selectedValue}
                    disabled={updating}
                    onSelect={selectVariant}
                />
            ) : (
                <Select value={selectedValue} onChange={handleDropdownChange} disabled={updating}>
                    <option value="">Select an option...</option>
                    {variants.map((variant) => (
                        <Option key={variant.getId()} value={variant.getId()} disabled={!variant.isEnabled()}>
                            {variant.getName()}
                            {getVariantPrice(variant) && ` (${getVariantPrice(variant)})`}
                        </Option>
                    ))}
                </Select>
            )}
        </Container>
    );
};

export default QuestionUI;
