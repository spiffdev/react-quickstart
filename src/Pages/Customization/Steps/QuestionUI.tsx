import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { QuestionStepHandle, Variant } from "@spiffcommerce/core";
import styled from "styled-components";

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

const QuestionUI: FunctionComponent<{
    step: QuestionStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
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
                <VariantGrid>
                    {variants.map((variant) => (
                        <VariantCard
                            key={variant.getId()}
                            $selected={selectedValue === variant.getId()}
                            $disabled={updating || !variant.isEnabled()}
                            onClick={() => selectVariant(variant)}
                        >
                            {variant.getThumbnail() && (
                                <VariantImage src={variant.getThumbnail()} alt={variant.getName()} />
                            )}
                            <VariantName>{variant.getName()}</VariantName>
                        </VariantCard>
                    ))}
                </VariantGrid>
            ) : (
                <Select value={selectedValue} onChange={handleDropdownChange} disabled={updating}>
                    <option value="">Select an option...</option>
                    {variants.map((variant) => (
                        <Option key={variant.getId()} value={variant.getId()} disabled={!variant.isEnabled()}>
                            {variant.getName()}
                        </Option>
                    ))}
                </Select>
            )}
        </Container>
    );
};

export default QuestionUI;
