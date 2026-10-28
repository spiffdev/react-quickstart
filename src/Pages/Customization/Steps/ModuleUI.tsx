import { FunctionComponent, useCallback, useState } from "react";
import { ModuleStepHandle } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 100px;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: #007bff;
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const HelperText = styled(Typography)`
    margin-top: 8px;
    font-size: 13px;
    color: #666;
`;

function getHelperText(step: ModuleStepHandle) {
    const remaining = step.getCharactersRemaining();
    return remaining !== undefined ? `${remaining} characters remaining` : "";
}

const ModuleUI: FunctionComponent<{
    step: ModuleStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [text, setText] = useState(() => step.getText());
    const [helperText, setHelperText] = useState(() => getHelperText(step));

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            onActivation?.();
            step.setText(value);
            setText(value);
            setHelperText(getHelperText(step));
        },
        [onActivation, step],
    );

    return (
        <Container data-test-step-type="module">
            <TextArea
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter your text here..."
            />
            {helperText && <HelperText variant="span">{helperText}</HelperText>}
        </Container>
    );
};

export default ModuleUI;
