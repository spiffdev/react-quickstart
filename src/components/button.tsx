import { FunctionComponent, ReactNode } from "react";
import styled from "styled-components";

// TODO: import theme config and use values

const StyledButton = styled.button<{ $fullWidth?: boolean }>`
    border-radius: 5px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    border: 1px solid var(--theme-primary-color);
    background-color: var(--theme-primary-color);
    color: var(--theme-primary-contrast-color);
    cursor: pointer;
    transition: all 0.2s;
    width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:hover:not(:disabled) {
        background-color: var(--theme-primary-color-hover);
        border-color: var(--theme-primary-color-hover);
    }

    &:disabled {
        background-color: #cccccc;
        border-color: #cccccc;
        cursor: not-allowed;
    }
`;

interface ButtonProps extends React.ComponentProps<"button"> {
    fullWidth?: boolean;
    /** Shown after the label. */
    icon?: ReactNode;
}

const Button: FunctionComponent<ButtonProps> = ({ children, fullWidth, icon, ...props }) => {
    return (
        <StyledButton type="button" $fullWidth={fullWidth} {...props}>
            {children}
            {icon}
        </StyledButton>
    );
};

export default Button;
