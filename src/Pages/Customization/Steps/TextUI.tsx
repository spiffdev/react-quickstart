import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
`;

const TextField = styled.input`
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #007bff;
    }
`;

const CheckboxContainer = styled.div`
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Checkbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
`;

const Label = styled.label`
    font-size: 14px;
    cursor: pointer;
`;

const ColorSection = styled.div`
    margin-top: 16px;
`;

const ColorTitle = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
`;

const ColorInput = styled.input`
    width: 100%;
    height: 48px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: 4px;
    }
`;

const TextUI: FunctionComponent<{
    step: Step<AnyStepData>;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [text, setText] = useState("");
    const [isCurved, setIsCurved] = useState(false);
    const [textColor, setTextColor] = useState("#000000");

    useEffect(() => {
        // TODO: Load text data from step when API is available
    }, [step]);

    const handleTextChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setText(value);
            onActivation?.();
            // TODO: Implement text update logic
        },
        [onActivation],
    );

    const handleCurvedChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const checked = event.target.checked;
            setIsCurved(checked);
            onActivation?.();
            // TODO: Implement curved text logic
        },
        [onActivation],
    );

    const handleColorChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const color = event.target.value;
            setTextColor(color);
            onActivation?.();
            // TODO: Implement color update logic
        },
        [onActivation],
    );

    return (
        <Container data-test-step-type="text">
            <TextField
                type="text"
                value={text}
                onChange={handleTextChange}
                onFocus={onActivation}
                placeholder="Enter text..."
            />
            <CheckboxContainer>
                <Checkbox type="checkbox" id="curved-text" checked={isCurved} onChange={handleCurvedChange} />
                <Label htmlFor="curved-text">Curved text</Label>
            </CheckboxContainer>
            <ColorSection>
                <ColorTitle variant="h3">Text Color</ColorTitle>
                <ColorInput type="color" value={textColor} onChange={handleColorChange} />
            </ColorSection>
        </Container>
    );
};

export default TextUI;
