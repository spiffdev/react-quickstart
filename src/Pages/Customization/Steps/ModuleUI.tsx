import { FunctionComponent, useCallback, useState } from "react";
import { Step, AnyStepData } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;
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

const HelperText = styled.div<{ error?: boolean }>`
    margin-top: 8px;
    font-size: 13px;
    color: ${(props) => (props.error ? "#d32f2f" : "#666")};
`;

const ModuleUI: FunctionComponent<{
    step: Step<AnyStepData>;
    onActivation?: () => void;
}> = ({ onActivation }) => {
    const [text, setText] = useState("");
    const [helperText] = useState("Enter text");
    const [error] = useState(false);

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            setText(value);
            // TODO: Implement text update logic when core API is available
        },
        [],
    );

    return (
        <Container data-test-step-type="module">
            <TextArea
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter your text here..."
            />
            {helperText && <HelperText error={error}>{helperText}</HelperText>}
        </Container>
    );
};

export default ModuleUI;
