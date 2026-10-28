import { FunctionComponent } from "react";
import styled from "styled-components";

// TODO: import theme config and use values

const StyledButton = styled.button<{ $fullWidth?: boolean }>`
    border-radius: 5px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    border: 1px solid #007bff;
    background-color: #007bff;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
    box-sizing: border-box;

    &:hover:not(:disabled) {
        background-color: #0056b3;
        border-color: #0056b3;
    }

    &:disabled {
        background-color: #cccccc;
        border-color: #cccccc;
        cursor: not-allowed;
    }
`;

interface ButtonProps extends React.ComponentProps<"button"> {
    fullWidth?: boolean;
}

const Button: FunctionComponent<ButtonProps> = ({ children, fullWidth, ...props }) => {
    return (
        <StyledButton type="button" $fullWidth={fullWidth} {...props}>
            {children}
        </StyledButton>
    );
};

export default Button;
