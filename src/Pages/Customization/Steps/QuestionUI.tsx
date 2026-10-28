import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience, Variant } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;
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
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, workflowExperience, onActivation }) => {
    const [selectedValue, setSelectedValue] = useState("");
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);

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
                    setSelectedValue(currentVariant.getId());
                }
            } catch (error) {
                console.error("Error loading question variants:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step.stepName, workflowExperience]);

    const handleChange = useCallback(
        async (event: React.ChangeEvent<HTMLSelectElement>) => {
            const value = event.target.value;
            setSelectedValue(value);
            onActivation?.();

            const stepHandle = workflowExperience.getStepById(step.stepName);
            if (!stepHandle) return;

            const variant = variants.find((v) => v.getId() === value);
            if (variant) {
                try {
                    await stepHandle.selectVariant(variant);
                } catch (error) {
                    console.error("Error selecting variant:", error);
                }
            }
        },
        [onActivation, step.stepName, variants, workflowExperience],
    );

    if (loading) {
        return <Container data-test-step-type="question">Loading...</Container>;
    }

    return (
        <Container data-test-step-type="question">
            <Select value={selectedValue} onChange={handleChange}>
                <option value="">Select an option...</option>
                {variants.map((variant) => (
                    <Option key={variant.getId()} value={variant.getId()} disabled={!variant.isEnabled()}>
                        {variant.getName()}
                    </Option>
                ))}
            </Select>
        </Container>
    );
};

export default QuestionUI;
