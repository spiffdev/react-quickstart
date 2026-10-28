import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, QuestionStepData } from "@spiffcommerce/core";
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
    step: Step<QuestionStepData>;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [selectedValue, setSelectedValue] = useState("");
    const [options] = useState<Array<{ id: string; name: string; enabled: boolean }>>([]);

    useEffect(() => {
        // TODO: Load variants/options from step when API is available
    }, [step]);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            const value = event.target.value;
            setSelectedValue(value);
            onActivation?.();
            // TODO: Implement variant selection logic
        },
        [onActivation],
    );

    return (
        <Container data-test-step-type="question">
            <Select value={selectedValue} onChange={handleChange}>
                <option value="">Select an option...</option>
                {options.map((option) => (
                    <Option key={option.id} value={option.id} disabled={!option.enabled}>
                        {option.name}
                    </Option>
                ))}
            </Select>
        </Container>
    );
};

export default QuestionUI;
